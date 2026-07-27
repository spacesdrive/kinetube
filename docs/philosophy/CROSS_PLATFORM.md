# Cross-Platform Support: Current State and Gaps

## Summary

KineTube's electron-builder configuration and GitHub Actions release workflow (`.github/workflows/release.yml`) build and publish installers for Windows (`nsis`), macOS (`dmg`, x64 + arm64), and Linux (`AppImage`).

As of 2026-07-26, all four managed tools have platform-aware download/build logic implemented for Windows, macOS, and Linux:

| Tool | Windows | macOS | Linux |
|---|---|---|---|
| yt-dlp | Working (verified) | Implemented, not yet run on real hardware | Implemented, not yet run on real hardware |
| ffmpeg | Working (verified) | Implemented, not yet run on real hardware | Implemented, not yet run on real hardware |
| whisper.cpp | Working (verified) | Implemented (build-from-source), not yet run on real hardware | Implemented (build-from-source), not yet run on real hardware |
| instaloader | Working (verified) | Working (verified) | Working (verified) |

**Read this before treating "implemented" as "done."** This development environment is Windows-only. The yt-dlp, ffmpeg, and whisper.cpp macOS/Linux code paths were implemented from verified, current documentation of each tool's actual release assets and install conventions (see Sources below), and are covered by unit tests for the pure platform-resolution logic (asset URL selection, binary naming) - but the actual download-and-run behavior on real macOS/Linux hardware has not been exercised in this session. Treat them as "should work, needs a real-machine verification pass" until someone runs the setup flow on an actual Mac and Linux box and confirms it. Update the table above with "verified" once that happens.

## instaloader: already cross-platform (no code change needed)

Earlier investigation of this codebase assumed instaloader was Windows-only because `backend/utils/instaloaderManager.js` used to manage a standalone `instaloader.exe` download. That code path turned out to be **dead code**: the actual Instagram login/profile/download flows in `backend/routes/instagram.js` (`detectPython()`, `loginWithPython()`, the `PROFILE_HELPER`/`LOGIN_HELPER` Python scripts) already go through `python3 -m pip install instaloader` and the `instaloader` Python module - which is identical, unbranched code on Windows, macOS, and Linux. The frontend's `InstagramLoginModal.jsx` only ever called the pip-based setup routes (`/api/instagram/setup/python/check`, `/api/instagram/setup/instaloader`); the `.exe`-based routes and manager functions (`ensureInstaloader`, `getInstaloaderPath`, `isInstaloaderReady`, `/api/instagram/setup`, `/api/instagram/setup/check`) were unreachable from the UI and have been removed (see `DECISIONS.md`).

**Remaining platform dependency:** Python 3.9+ must be installed and on `PATH`, on all three platforms - the app already detects this (`/api/instagram/setup/python/check`) and surfaces install instructions in `InstagramLoginModal.jsx` when it's missing.

## yt-dlp: implemented for all three platforms

`backend/utils/ytdlpManager.js` now resolves the release asset and local binary name per `process.platform`:

| Platform | Release asset | Local binary name |
|---|---|---|
| win32 | `yt-dlp.exe` | `yt-dlp.exe` |
| darwin | `yt-dlp_macos` (universal) | `yt-dlp` |
| linux | `yt-dlp_linux` (glibc x86_64) | `yt-dlp` |

All three are raw standalone binaries on the same pinned GitHub release (no zip extraction needed). On macOS/Linux, the binary is `chmod 755`'d after download. Source: yt-dlp's own release files table (`https://github.com/yt-dlp/yt-dlp/releases`, cross-checked via PyPI's release-files listing, 2026-07-26).

**Known narrower scope:** only x86_64 Linux is targeted (matching the Windows build's implicit x64-only assumption); `yt-dlp_linux_aarch64` exists upstream but is not wired up.

**Stopping a running yt-dlp process requires killing its whole tree, not just the spawned PID.** All three platform builds are PyInstaller "onefile" binaries: the process Node's `spawn()` gets a handle to is a launcher that unpacks itself and execs a second, separate process to do the real work, then waits on it. A plain `proc.kill()` only ends the launcher, leaving the real download running orphaned - confirmed on Windows by reproduction (see `DECISIONS.md` ADR-021). `backend/utils/processTree.js`'s `killProcessTree()` is the fix: `taskkill /pid <pid> /t /f` on Windows, a POSIX process-group kill (`process.kill(-pid, 'SIGTERM')` against a process spawned with `detached: true`) elsewhere. The POSIX path is implemented on the same reasoning that the Windows bug applies there too, but - like the rest of this table - is not yet hardware-verified on real macOS/Linux.

## ffmpeg: implemented for all three platforms

`backend/utils/ytdlpManager.js`'s `getFfmpegDownloadInfo(platform)` selects the source used by the same community-standard sources the popular `ffmpeg-static` npm package (1,300+ stars) relies on:

| Platform | Source | Format | Extraction |
|---|---|---|---|
| win32 | gyan.dev "essentials" build (unchanged) | zip | Match `bin/ffmpeg.exe` inside the zip |
| darwin | `https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip` - a stable redirect that always resolves to the current release, maintained by Helmut K. C. Tessarek | zip | Match a bare `ffmpeg` entry anywhere in the zip |
| linux | `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz` - static x86_64 build, maintained by John Van Sickle | tar.xz | Shell out to the system `tar` binary (`tar -xJf`), then locate `ffmpeg` recursively in the extracted tree |

Both non-Windows binaries are `chmod 755`'d after extraction.

**Deliberate scope decisions (see `DECISIONS.md` for the full ADR):**
- **macOS is x64-only.** evermeet.cx explicitly does not build for Apple Silicon ARM. Rather than depend on osxexperts.net's Apple Silicon builds - which have no stable, version-agnostic download URL (filenames embed a version number, e.g. `ffmpeg81arm.zip`, that changes every release) - this app ships the x64 build for all Macs and relies on Rosetta 2 to run it on Apple Silicon. This trades a one-time Rosetta 2 install prompt for eliminating a URL that would silently go stale.
- **Linux static build extraction depends on the system `tar` command being present.** This is a safe assumption (`tar` and `xz-utils` ship with virtually every Linux distribution), but it is an assumption, not a bundled dependency - if `tar` is missing, setup fails with a clear, actionable error message rather than a cryptic one.

## whisper.cpp: implemented via build-from-source for macOS/Linux

ggml-org's official whisper.cpp releases (`https://github.com/ggml-org/whisper.cpp/releases`, checked 2026-07-26) publish prebuilt binaries only for Windows (`whisper-blas-bin-x64.zip` and similar) plus WASM/xcframework artifacts - there is no official prebuilt macOS or Linux CLI binary to download. A handful of unofficial third-party projects publish cross-platform prebuilt binaries, but they are new, unaudited, single-maintainer GitHub repositories; downloading and executing a binary from an unverified low-trust source is a supply-chain risk this project declines to take (see `DECISIONS.md`).

Instead, `backend/utils/whisperManager.js` builds whisper.cpp from source on macOS/Linux:

1. Verify `git` and `cmake` are on `PATH` (fails fast with an actionable error naming exactly what's missing and how to install it, e.g. `xcode-select --install` on macOS or `sudo apt install git cmake build-essential` on Debian/Ubuntu, if not)
2. `git clone --depth 1 --branch v${WHISPER_VERSION}` into a temp directory (same pinned version as the Windows zip, for consistency)
3. `cmake -B build -S .` then `cmake --build build --config Release -j`
4. Copy the resulting `whisper-cli` binary (plus any `.so`/`.dylib` it was dynamically linked against) into the managed downloads directory, `chmod 755`

**This is the heaviest-weight of the four tools to get working on a fresh macOS/Linux machine** - it additionally requires a working C/C++ toolchain (a full compiler, not just `cmake` and `git`), which the preflight check does not itself verify (a missing compiler surfaces as a `cmake`/build failure with the compiler's own error text, not a friendlier message). This is a known, accepted rough edge - improving it further (e.g. detecting a missing compiler specifically) is tracked in `ROADMAP.md`.

## Related, smaller finding: `/api/dialog/folder` is Windows-only

`backend/routes/info.js`'s `GET /api/dialog/folder` shells out to PowerShell to show a native folder picker. This is **not** Windows-only in the way that matters for the packaged app: the renderer always prefers `window.electronAPI.openFolderDialog()` (Electron's own cross-platform `dialog.showOpenDialog`, wired up in `electron/main.js`) and only falls back to this HTTP route when running the frontend outside Electron (e.g. `vite preview` in a plain browser during development). The PowerShell-only fallback therefore only affects a dev-only scenario, not the shipped app on any platform. Not fixed in this pass since it doesn't affect real users; noted here so it isn't mistaken for a fourth core-feature gap.

## Guidance for Anyone Touching a Manager

- Do not add a new hardcoded `.exe` suffix or Windows-only URL without checking whether the platform-aware pattern already established in `ytdlpManager.js`/`whisperManager.js` should be extended instead.
- If you get real macOS or Linux hardware access, run the setup flow for each tool and update the verification table at the top of this file - that is the single most valuable update this document can currently receive.
- Do not advertise macOS/Linux support as fully verified in `README.md` or release notes until the table above shows "verified," not just "implemented," for all four tools.

## Sources Consulted (2026-07-26)

- yt-dlp release assets: `https://github.com/yt-dlp/yt-dlp/releases`, `https://pypi.org/project/yt-dlp` (release files table)
- ffmpeg static builds: `https://johnvansickle.com/ffmpeg/`, `https://evermeet.cx/ffmpeg/` and `https://evermeet.cx/projects` (documented API URLs), `https://github.com/eugeneware/ffmpeg-static` (industry-standard reference implementation of this exact multi-platform download pattern)
- whisper.cpp releases: `https://github.com/ggml-org/whisper.cpp/releases`
- instaloader installation: `https://github.com/instaloader/instaloader`, `https://pypi.org/project/instaloader`
