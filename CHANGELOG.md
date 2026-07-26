# Changelog

All notable changes to KineTube are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Released versions below are reconstructed from `git log`/tag history as of 2026-07-26. Individual commit-level detail earlier than that date is authoritative in `git log`, not repeated here in full.

---

## [Unreleased]

Nothing yet.

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
