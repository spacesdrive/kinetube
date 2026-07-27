# Tool Managers

All orchestration of external binaries lives in `backend/utils/*Manager.js`. Route handlers never `spawn()` a binary path they built themselves - they call into a manager. This document describes the shared contract and each manager's specifics.

As of 2026-07-26, yt-dlp, ffmpeg, and whisper.cpp are all platform-aware (Windows/macOS/Linux); instaloader was already platform-agnostic via its Python-module install path. See `docs/philosophy/CROSS_PLATFORM.md` for the full breakdown, sources, and the "implemented but not yet verified on real macOS/Linux hardware" caveat.

## Shared Contract

Every manager follows the same shape, established by `ytdlpManager.js`:

| Function | Purpose |
|---|---|
| `getXPath()` / `getXExe()` | Returns the resolved path to the managed binary, or `null` if not installed |
| `isXReady()` / `checkXStatus()` | Synchronous or cheap check of install state, used by `*/setup/check` routes |
| `ensureX(onEvent)` | Downloads/builds the tool if missing, emitting `phase`/`progress` events; no-ops if already installed |
| `downloadFileWithProgress(url, dest, onProgress)` | Shared low-level download helper (HTTP/HTTPS GET with redirect-following and progress callback), imported by every manager from `backend/utils/download.js` - see `DECISIONS.md` ADR-015 |

All managers resolve their install directory from `backend/utils/paths.js` (`DOWNLOADS_DIR`, `MODELS_DIR`, or `SESSIONS_DIR`), never a path relative to their own `__dirname`. On macOS/Linux, every downloaded or built binary is `chmod 755`'d before use.

## `ytdlpManager.js`

Manages both **yt-dlp** and **ffmpeg** (bundled together since ffmpeg is only needed to merge yt-dlp's separate video/audio streams).

**yt-dlp:** `getYtdlpDownloadUrl(platform)` resolves to the pinned-version GitHub release asset for the current platform - `yt-dlp.exe` (win32), `yt-dlp_macos` (darwin), `yt-dlp_linux` (linux). All three are raw standalone binaries; no extraction needed. `checkYtdlpStatus()` shells out to the binary with `--version` and compares against `YTDLP_VERSION` to report whether an update is available.

**ffmpeg:** `getFfmpegDownloadInfo(platform)` returns `{ archiveType, url, matchEntry }` per platform:
- win32: gyan.dev zip, matches `bin/ffmpeg.exe` inside it (unchanged from before)
- darwin: evermeet.cx's stable release-redirect zip, matches a bare `ffmpeg` entry (x64 only - relies on Rosetta 2 on Apple Silicon, see `DECISIONS.md`)
- linux: johnvansickle.com static `tar.xz`, extracted by shelling out to the system `tar` command and locating `ffmpeg` recursively (no npm tar/xz library dependency was added for this)

`getYtdlpAssetName`, `getYtdlpBinaryName`, `getYtdlpDownloadUrl`, `getFfmpegBinaryName`, and `getFfmpegDownloadInfo` are all pure functions (take a `platform` string, do no I/O) exported specifically so the platform-resolution logic is unit-testable without mocking `process.platform` - see `backend/test/ytdlpManager.platform.test.js`.

Exposes `FFMPEG_EXE_PATH` and `YTDLP_EXE_PATH` as constants (platform-correct, no `.exe` on POSIX) imported by other managers and by `download.js`/`transcribe.js`.

## `whisperManager.js`

Manages **whisper.cpp** and the **GGML model files** it needs.

- **Windows:** downloads the pinned `whisper-blas-bin-x64.zip` release asset and extracts all `.exe`/`.dll` files (unchanged from before).
- **macOS/Linux:** ggml-org does not publish prebuilt binaries for these platforms (confirmed against their GitHub releases - only Windows zips and WASM/xcframework artifacts exist). Rather than depend on an unofficial third-party binary distributor, `ensureWhisper()` builds from source: verifies `git` and `cmake` are on `PATH`, clones the pinned tag into a temp directory, runs `cmake -B build -S .` then `cmake --build build --config Release -j`, and copies the resulting `whisper-cli` (plus any `.so`/`.dylib` it links against) into the managed downloads directory.
- After extraction/build, the binary is located by checking candidate filenames - `whisper-cli.exe`/`main.exe` on Windows, `whisper-cli`/`main` on macOS/Linux (whisper.cpp renamed its CLI entry point from `main` to `whisper-cli` starting at v1.7).
- `getWhisperBinaryName(platform)` is a pure function exported for unit testing this naming logic - see `backend/test/whisperManager.test.js`.
- `MODELS` is a static registry of five model sizes (`tiny` through `large`), each mapped to a Hugging Face filename and approximate size in MB, used both for download and for the Settings/Transcribe UI's picker. Model downloads are identical across all platforms - only the CLI binary itself differs.
- `extractAudio()` shells out to the ffmpeg path owned by `ytdlpManager` (imported, not re-resolved) to produce a 16 kHz mono WAV before invoking whisper - whisper.cpp requires that exact format.
- `cleanTranscription()` strips whisper's `[HH:MM:SS.mmm --> HH:MM:SS.mmm]` timestamp markers and collapses the output into flowing paragraphs. This is a pure function and is unit tested - see `backend/test/whisperManager.test.js`.
- `transcribeFile()` has a 30-minute hard timeout on the whisper subprocess, after which it is killed and the promise rejects.

## `instaloaderManager.js`

Manages the Instagram **account/session registry** only: `accounts.json` (username + added-at timestamp only) and per-account session cookie files (`session-<username>`), both under `SESSIONS_DIR`. Also maintains an in-memory `activeLogins` map keyed by username, holding a reference to a paused login subprocess awaiting a 2FA code - this is why 2FA submission (`POST /api/instagram/login/2fa`) can resume a specific in-flight process rather than starting over.

**This manager does not download or manage any binary.** Instagram scraping itself goes through `python3 -m pip install instaloader` and the `instaloader` Python module, orchestrated entirely in `backend/routes/instagram.js` (`detectPython()`, `checkPythonSetup()`, `loginWithPython()`, and the `instaloader_login.py`/`instaloader_profile.py` helper scripts). That path has no platform-specific code - `pip install` and `python3 -m instaloader` work identically on Windows, macOS, and Linux, given Python is installed. An earlier version of this manager downloaded a Windows-only standalone `instaloader.exe`; that code was dead (never called by the frontend) and has been removed - see `DECISIONS.md`.

Session files and `accounts.json` are read/written only by this manager - route handlers never touch the filesystem paths directly.

## Resuming an interrupted download

`backend/utils/pendingDownloads.js` is not a tool manager - it doesn't own a binary - but it lives alongside the managers because it exists to make one of their outputs (a partially-downloaded video) recoverable. `backend/routes/download.js` records every single-video download's request parameters (`makeDownloadId()` hashes the exact fields that determine yt-dlp's output path: URL, quality, audio-only flag, output dir, prefix/suffix/naming template, numbering) to a small JSON file the moment the download starts, and removes that record the instant the request ends for any reason handled in-process - success, failure, or the user cancelling.

A record only survives to the next app launch if the whole process was killed before it could clean up after itself. `GET /api/download/pending` returns whatever is left, and `DELETE /api/download/pending/:id` lets the user dismiss one without resuming it. The frontend's `ResumeDownloadsBanner` (see `docs/architecture/frontend/REACT_ARCHITECTURE.md`) re-issues the exact original request on "Resume" - yt-dlp resumes the partial `.part` file on its own (its default `--continue` behavior) as long as the output path matches exactly, which is why the recorded parameters have to be replayed verbatim rather than rebuilt from the user's current download settings.

Only single-video downloads are tracked this way; bulk/sequential and Instagram downloads are not - see `ROADMAP.md`. See `DECISIONS.md` ADR-017 for the full reasoning and alternatives considered.

## Adding or Extending a Manager

See `docs/features/NEW_TOOL_MANAGER.md`. Before writing platform-specific download logic, read `docs/philosophy/CROSS_PLATFORM.md` for the currently-established pattern (platform-keyed pure resolver functions + a runtime constant computed from `process.platform`) and the verification-status caveat for the macOS/Linux paths implemented so far.
