# Changelog

All notable changes to KineTube are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Released versions below are reconstructed from `git log`/tag history as of 2026-07-26. Individual commit-level detail earlier than that date is authoritative in `git log`, not repeated here in full.

---

## [Unreleased]

### Changed

**TypeScript rewrite**
- The backend, frontend, Electron main process and helper scripts are now strict TypeScript. The request, response and stream-event types live in `shared/types/` and are shared by all three projects. See `DECISIONS.md` ADR-023 and ADR-028.
- The backend is split into layers: route tables, validators, controllers, services, stores, tool managers and URL parsers. Only the tool managers start yt-dlp, FFmpeg, whisper.cpp or Python.
- The packaged app runs compiled JavaScript, because Electron 33 runs the backend on Node 20. Development needs Node 22.18 or newer. See ADR-029.

**Versioned REST API**
- Every route moved to `/api/v1` and is named after a resource. Actions are POST requests with JSON bodies, and every error has the same shape. `docs/architecture/backend/ROUTES.md` lists each 1.x route next to its replacement, and `docs/api/openapi.yaml` describes the whole API. See ADR-024.
- Long tasks still stream server-sent events, but the frontend now reads them with `fetch`, and every stream ends with one `done` event (a paused download ends with `paused`). See ADR-025.
- All requests go through one typed client, `frontend/src/services/api.ts`. See ADR-027.

**Downloads**
- YouTube and Instagram downloads share one runner. Instagram downloads can now be paused, resumed, and offered again after the app closes. See ADR-031.
- A single download refuses channel and profile links, so pasting one can no longer start a download of a whole page.
- The default quality chosen in Settings is now applied to new downloads.
- The folder picker no longer blocks the backend while its dialog is open.

### Fixed
- **Any web page could control the app.** The backend listened on every network interface and, in the installed app, accepted requests from any origin. It now listens on 127.0.0.1 only and refuses requests with a foreign Host or Origin. See ADR-026.
- **Command injection through bulk Instagram downloads.** A queue item such as `--exec=<command>` was passed to yt-dlp unparsed and ran a command. Every link is now parsed, and yt-dlp gets it after `--`.
- **Path traversal when removing an Instagram account.** A username containing `../` reached files outside the sessions folder. Usernames are now validated.
- **Image proxy host check.** `evilinstagram.com` passed the allowlist because hosts were matched with `endsWith`. Hosts now match exactly or as a real subdomain, over https only, and every redirect is checked.
- **Instagram lookups failed with an account selected.** The instaloader session was handed to yt-dlp as a cookie file, which yt-dlp cannot read. Post lookups and downloads now run logged out, and profiles still use the session. See ADR-030.
- **A failed yt-dlp update deleted the working binary.** The update now downloads to a temporary file and replaces the old binary only after the download finishes.
- **Saved Instagram sessions could end up in the installer.** `extraResources` now leaves out `backend/sessions/`.
- **Reopening the window on macOS showed a loading page forever.** Closing the last window stopped the backend, and a window reopened from the dock never started it again. The backend now runs until the app quits.
- **macOS and Linux tool binaries were not excluded.** The packaging filter and `.gitignore` only matched Windows file names, so a local build on a Mac or Linux machine could ship its own copies of yt-dlp, FFmpeg and whisper-cli. Both now list the extensionless names and the `.so` and `.dylib` libraries.

### Removed
- `axios` and `cors`, which are no longer needed.
- The emoji startup banner in the backend log.

---

## [1.6.0] - 2026-07-27

### Added

**Live yt-dlp update check in Settings**
- Settings' About card now shows the installed yt-dlp version with its own "Check for Updates" button, alongside the app's own version/update row. The check calls GitHub's latest-release API directly, so it can tell you about a newer yt-dlp release even if KineTube's own pinned baseline hasn't been bumped yet.
- When a newer release is found, the button becomes "Update to `<version>`" - clicking it re-downloads that release in place, with a live progress bar, no manual file swap required. Works the same way across Windows, macOS, and Linux (each platform's own yt-dlp release asset).
- New routes: `GET /api/ytdlp-update-check` (JSON), `GET /api/ytdlp-update` (SSE download stream).
- Fixed a related bug this surfaced: the existing pinned-version "outdated" check used a plain inequality, so a binary updated *past* the pinned baseline via this new feature was incorrectly flagged as outdated again. It now only flags a binary that is genuinely older.
- See `DECISIONS.md` ADR-022.

---

## [1.5.1] - 2026-07-27

### Fixed
- **Pause (and Cancel) didn't actually stop a YouTube download** - clicking Pause while a video or audio stream was downloading appeared to do nothing until the download reached the merge step, at which point the UI reported "Paused" even though the file had actually finished downloading and merging in full in the background. Root cause: yt-dlp's release binaries are PyInstaller "onefile" builds - the process Node spawns is a launcher that starts a second, separate process to do the real download and just waits on it, so killing only the launcher PID left the real work running as an orphan. `backend/utils/processTree.js` now kills the entire process tree (`taskkill /pid <pid> /t /f` on Windows, a POSIX process-group kill elsewhere) instead of a plain `proc.kill()`. Applied to every yt-dlp-spawning kill site in `backend/routes/download.js` and `backend/routes/instagram.js` - Cancel had the identical defect and is fixed by the same change. See `DECISIONS.md` ADR-021.

---

## [1.5.0] - 2026-07-27

### Added

**Pause and Resume a download in progress**
- `ProgressModal.jsx` now shows a Pause button during an active single-video download, and a Resume button once paused.
- New route: `POST /api/download/:id/pause`. Pause kills the yt-dlp process (the same mechanism Cancel already used) but keeps the pending-download record instead of clearing it, and sends a new `paused` SSE event instead of `done`. Resume replays the exact original request; yt-dlp continues the same partial file on its own.
- Pausing and force-closing the app compose for free: a paused download that's still paused when the app closes shows up in the resume-after-restart banner too, since both features share the same underlying record.
- Only single-video YouTube downloads are covered - no Pause button on bulk/sequential or Instagram downloads yet.
- See `DECISIONS.md` ADR-020.

---

## [1.4.1] - 2026-07-27

### Fixed
- **`npm run dev` crashed on startup before any window opened** - `TypeError: Cannot read properties of undefined (reading 'getVersion')` inside `electron-updater`. Root cause: `ELECTRON_RUN_AS_NODE=1` was present in the shell environment (commonly leaked by Electron-based terminals like VS Code/Cursor), which makes any Electron binary run as plain Node.js instead of the real Electron runtime, so `electron.app` never exists. `npm run dev`'s Electron step now runs through a new `scripts/run-electron.js` wrapper that strips this variable before spawning Electron. Only affects local development - packaging (`dist:*`) and the installed app are unaffected. See `DECISIONS.md` ADR-018.

### Added

**Version display and manual update check in Settings**
- The About card in Settings now shows the running app version and a "Check for Updates" button, so a user isn't limited to the one automatic check five seconds after launch.
- New IPC channels: `get-app-version`, `check-for-updates`; `update-status` now also forwards `checking` and `not-available` events.
- The button is a no-op with a clear "only runs in a packaged build" message in dev, since `electron-updater` requires a packaged build's `app-update.yml`.
- See `DECISIONS.md` ADR-019.

### Documentation
- `README.md` was updated to reflect features shipped in v1.3.0-v1.4.0 (resume downloads, in-app update check) and to correct two stale lines (instaloader's install method, whisper.cpp's per-platform install method) - this had fallen behind for several releases.

---

## [1.4.0] - 2026-07-27

### Added

**Resume an interrupted download**
- If KineTube is closed (or crashes) while a single-video download is in progress, the next launch now offers to resume it instead of losing the progress. `backend/utils/pendingDownloads.js` records each in-flight download's request parameters and clears the record on any normal end (success, failure, or cancel); a leftover record can only mean the app itself was killed mid-download.
- New routes: `GET /api/download/pending`, `DELETE /api/download/pending/:id`
- New `frontend/src/components/ResumeDownloadsBanner.jsx`, shown on the YouTube tab when a resumable download is found. "Resume" re-issues the exact original request; yt-dlp resumes its own partial `.part` file automatically.
- Bulk/sequential and Instagram downloads are not covered by this yet - see `ROADMAP.md`.
- See `DECISIONS.md` ADR-017.

### Changed

**Shared download helper**
- `backend/utils/ytdlpManager.js` and `backend/utils/whisperManager.js` no longer each carry their own copy of the HTTPS/HTTP redirect-following, progress-reporting download function - both now import `downloadFileWithProgress()` from a new `backend/utils/download.js`. The unified version is the more robust of the two prior copies (follows `http:` redirects, not just `https:`, and correctly rejects and cleans up on a response error mid-stream, which the yt-dlp copy did not). The dead, unused `downloadFile()` (no-progress variant) was deleted.
- See `DECISIONS.md` ADR-015.

**Centralized frontend `api.js`**
- Added `frontend/src/lib/api.js` (`getJSON`, `postJSON`, `postJSONStrict`, `postRequest`, `deleteRequest`) and migrated every plain (non-SSE, non-streaming) `fetch()` call site across `App.jsx`, `DownloadSettings.jsx`, `SettingsPage.jsx`, `InstagramLoginModal.jsx`, and `TranscribePage.jsx` to use it, removing the duplicated request-building/JSON-parsing/error-throwing boilerplate from each component.
- SSE (`EventSource`) consumption and the two call sites needing a raw `Response` (file upload via `FormData`, streaming-response transcription) are unchanged by design.
- See `DECISIONS.md` ADR-016 (supersedes ADR-006).

### Fixed
- A stray corrupted line in `ROADMAP.md`'s Known Issues section (mismatched markdown bold/italic markers) was restored.
- A missing `@testing-library/react` cleanup registration meant component tests that query the DOM by role/position (rather than unique text) could silently match elements left over from a previous test in the same file. Added `frontend/src/test/setup.js` (wired via `vite.config.js`'s `test.setupFiles`) to register `afterEach(cleanup)` globally.

### Tests
- `backend/test/download.test.js` - the shared download helper against a local throwaway HTTP server (redirects, redirect-limit exhaustion, non-200 responses, mid-stream connection drops, missing destination directory)
- `backend/test/pendingDownloads.test.js` - the resume registry (id stability, title updates, removal, corrupt/missing state file)
- `backend/test/routes.test.js` - `GET /api/download/pending` and `DELETE /api/download/pending/:id`
- `frontend/src/lib/__tests__/api.test.js` - every `lib/api.js` helper
- `frontend/src/components/__tests__/ResumeDownloadsBanner.test.jsx` - render states and Resume/Dismiss callbacks

---

## [1.3.1] - 2026-07-26

### Fixed
- **Auto-update 404 on Windows** - `v1.3.0`'s in-app updater failed with `Cannot download "...KineTube-Setup-1.3.0.exe", status 404`. The unset NSIS `artifactName` default (`${productName} Setup ${version}.${ext}`, with a literal space) got sanitized two different, incompatible ways: electron-builder wrote a dash-separated name into `latest.yml` while GitHub's asset upload API rewrote the same spaces to dots on the actual uploaded `.exe`. Pinned `build.nsis.artifactName` to `${productName}-Setup-${version}.${ext}` (no spaces) in `package.json` so both names converge - see `DECISIONS.md` ADR-014.
- **Update-failed dialog text overflow** - a long error message (e.g. the download URL in the 404 above) could overflow past the fixed-width update dialog instead of wrapping. Added `break-words` to the shared `DialogDescription` primitive (`frontend/src/components/ui/dialog.jsx`) so long unbroken strings wrap inside any dialog, not just this one.

---

## [1.3.0] - 2026-07-26

### Added

**Cross-platform tool support (yt-dlp, ffmpeg, whisper.cpp)**
- `backend/utils/ytdlpManager.js` - yt-dlp now downloads the correct standalone binary per platform (`yt-dlp.exe` / `yt-dlp_macos` / `yt-dlp_linux`) from the same pinned GitHub release, with `chmod 755` applied on macOS/Linux
- `backend/utils/ytdlpManager.js` - ffmpeg now downloads from gyan.dev (Windows, unchanged), evermeet.cx's stable release-redirect zip (macOS x64, relies on Rosetta 2 for Apple Silicon), or johnvansickle.com's static `tar.xz` build (Linux x64, extracted by shelling out to the system `tar` command)
- `backend/utils/whisperManager.js` - whisper.cpp now builds from source on macOS/Linux (`git clone` the pinned tag, `cmake -B build` + `cmake --build`), since ggml-org does not publish official prebuilt binaries for those platforms and this project declines to depend on unofficial third-party binary distributors; fails with an actionable error if `git`/`cmake` are missing
- New pure, platform-keyed resolver functions exported for testability: `getYtdlpAssetName`, `getYtdlpBinaryName`, `getYtdlpDownloadUrl`, `getFfmpegBinaryName`, `getFfmpegDownloadInfo` (`ytdlpManager.js`), `getWhisperBinaryName` (`whisperManager.js`)
- `docs/philosophy/CROSS_PLATFORM.md` rewritten with a per-tool, per-platform verification-status table, full source citations, and the reasoning behind each platform-support decision (see `DECISIONS.md` ADR-011 and ADR-012)

**Instagram cross-platform correction**
- Removed the dead Windows-only `instaloader.exe` download path (`ensureInstaloader`, `getInstaloaderPath`, `isInstaloaderReady`, and the `GET /api/instagram/setup` / `GET /api/instagram/setup/check` routes) - it was unreachable from the frontend and had been fully superseded by the existing `pip install instaloader` + Python-module flow, which was already cross-platform with no code changes needed (see `DECISIONS.md` ADR-010)

**Backend testability**
- `backend/server.js` now exports the Express `app` and only auto-starts (`app.listen` + binary checks) when run as the process entry point (`require.main === module`), so it can be driven directly with `supertest` in tests without binding a port (see `DECISIONS.md` ADR-013)
- Added `backend/test/routes.test.js` - `supertest`-based integration tests for `GET /health`, `GET /api/ytdlp-status`, `POST /api/info` validation, `GET /api/validate-path`, `GET /api/transcribe/setup/check`, `GET /api/transcribe/models`, `GET /api/instagram/accounts`, and `GET /api/proxy/img`'s allow-list enforcement
- Added `backend/test/ytdlpManager.platform.test.js` - unit tests for the new yt-dlp/ffmpeg platform-resolution functions across `win32`/`darwin`/`linux`
- Extended `backend/test/whisperManager.test.js` with `getWhisperBinaryName()` coverage
- Added `supertest` as a backend devDependency

**Frontend testability**
- Extracted `cleanYouTubeUrl()`/`cleanInstagramUrl()` out of `App.jsx` into `frontend/src/lib/urlCleaners.js` so they're unit-testable in isolation; `App.jsx` now imports them
- Added `frontend/src/lib/__tests__/urlCleaners.test.js` - unit tests for both URL cleaners across every supported URL shape
- Added `frontend/src/components/__tests__/ProgressModal.test.jsx` - component tests covering null render, single-download progress/done/failure/transcribe-button states, and bulk-download totals/status using `@testing-library/react`
- Added `@testing-library/react` and `@testing-library/dom` as frontend devDependencies

**Documentation suite**
- `CLAUDE.md` - root AI operating manual: project identity, reading order, documentation map, engineering standards, MCP usage rules, documentation maintenance policy. To be read before any task in this repository.
- `docs/WRITING_STANDARDS.md` - typography, icon, writing style, UI copy, and commit message rules
- `docs/architecture/OVERVIEW.md` - process topology, dev vs. packaged startup, request lifecycles (metadata fetch and SSE download), data storage strategy, architectural invariants
- `docs/architecture/electron/MAIN_PROCESS.md` - window lifecycle, backend process management, auto-updater, full IPC surface table
- `docs/architecture/backend/EXPRESS.md` - app structure, CORS policy, image proxy allow-list, static frontend serving, startup sequencing
- `docs/architecture/backend/ROUTES.md` - full route table for `info`, `download`, `setup`, `transcribe`, and `instagram` routers
- `docs/architecture/backend/MANAGERS.md` - shared tool-manager contract and per-manager specifics (yt-dlp, ffmpeg, whisper.cpp, instaloader)
- `docs/architecture/frontend/REACT_ARCHITECTURE.md` - component tree, state management approach, backend communication patterns, Electron bridge usage
- `docs/guidelines/JAVASCRIPT.md`, `docs/guidelines/REACT.md`, `docs/guidelines/NAMING.md`, `docs/guidelines/ERROR_HANDLING.md` - code standards, including the shared SSE `phase`/`progress`/`done`/`error` event contract
- `docs/workflows/FEATURE_DEVELOPMENT.md`, `docs/workflows/TESTING.md`, `docs/workflows/GIT.md`, `docs/workflows/RELEASE.md` - implementation sequence, test strategy, commit conventions, and the electron-builder/GitHub Actions release flow
- `docs/features/NEW_API_ROUTE.md`, `docs/features/NEW_TOOL_MANAGER.md` - step-by-step guides for the two most common extension points
- `docs/philosophy/ARCHITECTURE.md` - core architectural principles and when it's acceptable to break them
- `docs/philosophy/CROSS_PLATFORM.md` - per-tool, per-platform cross-platform support breakdown and verification status
- `docs/mcp/OVERVIEW.md` - decision guide for Context7 / Filesystem / Sequential Thinking / Parallel Search in this project
- `DECISIONS.md` - architectural decision log
- `ROADMAP.md` - prioritized gaps and planned work

**Automated tests**
- Backend: `node:test` wired up via `npm test` (`backend/package.json`)
  - `backend/test/urlParser.test.js` - every supported YouTube URL shape and invalid input
  - `backend/test/instagramUrlParser.test.js` - post/reel/story/profile/profile-tab URLs, tracking-param stripping, and reserved-path rejection
  - `backend/test/whisperManager.test.js` - `cleanTranscription()` timestamp stripping and paragraph collapsing, `MODELS` registry shape, `getModelPath()`/`getWhisperBinaryName()` resolution
  - `backend/test/paths.test.js` - confirms `DOWNLOADS_DIR`/`MODELS_DIR`/`SESSIONS_DIR` resolve under `ELECTRON_USER_DATA` when set and fall back to the backend-relative default in dev
  - Exported `cleanTranscription()` from `backend/utils/whisperManager.js` (previously private) so it can be tested directly
- Frontend: Vitest + jsdom wired up via `npm test` (`frontend/package.json`), configured in `vite.config.js`
  - `frontend/src/lib/__tests__/utils.test.js` - `cn()`'s class-name joining, conditional/falsy handling, and Tailwind conflict resolution
- Root `npm test` runs both suites in sequence (`npm run test:backend && npm run test:frontend`)

### Fixed
- Two empty `catch {}` blocks in `App.jsx` flagged by the existing `no-empty` ESLint rule (added explanatory comments, matching the pattern already used elsewhere in the codebase)

---

## [1.2.0] - 2026-06-25

### Added
- Auto-update dialog (`UpdateDialog.jsx`) built with shadcn UI, wired to `electron-updater`: checks GitHub Releases 5 seconds after startup in packaged builds, shows a version badge and download progress bar, and locks the dialog during download so it can't be dismissed mid-update
- GitHub Actions release workflow now also uploads the `latest*.yml` metadata files `electron-updater` requires to detect new versions

## [1.1.0] - 2026-06-25

### Fixed
- Extracted `ThumbGridItem` as its own component to fix a React rules-of-hooks violation (`useState` was being called inside `.map()`)
- Fixed the indeterminate state of the bulk-selection checkbox in `MultiCard` to use shadcn's `checked="indeterminate"` prop instead of a manual workaround
- Fixed a stale-closure bug in `handlePlatformChange` by adding `platform` to its dependency array
- Wired `SettingsPage`'s `onSave` prop to a new `syncDownloadSettings` callback so saved settings apply immediately without navigating away
- Removed dead state (`igSetupReady`, `igSetupLoading`) left over from the sidebar migration, an unused `Separator` import in `App.jsx`, and the now-fully-orphaned `Navbar.jsx`

## [1.0.0] - 2026-06-18

Initial release: a working Electron + Express + React desktop app for downloading YouTube and Instagram media and transcribing it locally with Whisper.

### Added

**Backend**
- Express entry point (`backend/server.js`) listening on port 3001
- `POST /api/info` - YouTube video/channel metadata via yt-dlp
- `GET /api/download` - SSE-streamed download with real-time progress
- `GET /api/setup` - SSE-streamed first-run yt-dlp/ffmpeg installation
- yt-dlp/ffmpeg manager with progress-aware download (`ytdlpManager.js`)
- YouTube URL parser with tracking-param stripping (video, Shorts, channel `/videos`, channel `/shorts`)
- Instagram download routes and instaloader integration
- Whisper transcription route and manager, with `filePath` emitted in the download SSE `done` event so a completed download can be transcribed immediately
- Module-level server reference to prevent premature garbage collection, plus `EADDRINUSE` handling on startup
- Writable-data redirect to `app.getPath('userData')` so a packaged app never writes into its own `Program Files` install directory

**Frontend**
- React app entry point, main SSE-driven download engine, and URL cleaning on paste
- `YtdlpAlert`, `SetupScreen` (animated first-run tool installation), `VideoView` (quality selector, Audio Only tab), `ChannelView` (bulk download, per-video controls), `ProgressModal` (phase-aware progress bar), `DownloadSettings` (folder/naming options)
- Instagram support, per-item transcription, batch download, and a Settings page
- Full migration to shadcn/ui across every component (`VideoView`, `ChannelView`, `DownloadSettings`, `ProgressModal`, `BatchResultsView`, `YtdlpAlert`, `SetupScreen`, `SettingsPage`, `TranscribePage`, `InstagramLoginModal`, `InstagramPostView`, `InstagramProfileView`)
- Collapsible `AppSidebar` (icon-only mode, brand SVG nav icons, theme toggle) replacing the original horizontal navbar, with a breadcrumb header via `SidebarProvider`/`SidebarInset`
- Dark/light/system theming via `next-themes`, with Tailwind v4 dark-mode CSS variable overrides and a `ModeToggle`

**Packaging and CI**
- GitHub Actions release workflow building Windows, macOS, and Linux artifacts
- `build/icon.png` (512x512, required by macOS) and platform icon paths
- Fixes to the release workflow so `scripts/` and `electron/` are included in the packaged app and backend `node_modules` are installed before packaging

**Documentation**
- Initial comprehensive `README.md` with architecture diagrams, feature table, and quick start guide
