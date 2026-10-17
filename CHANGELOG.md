# Changelog

All notable changes to KineTube are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Released versions below are reconstructed from `git log`/tag history as of 2026-07-26. Individual commit-level detail earlier than that date is authoritative in `git log`, not repeated here in full.

---

## [Unreleased]

## [2.1.0] - 2026-10-18

The website, transcripts in seven formats and direct installer downloads. The macOS and Linux installers are still untested on real hardware.

### Added
- A website at https://kinetube.ujjwal.fyi with a home page and the user docs, in `site/` (issues #14 to #18, ADR-040). It follows the layout and motion of activepieces.com in the kinetube brand: a scroll story, product pictures driven by a cursor, the real app clips, and docs with search. `.github/workflows/deploy-site.yml` checks every change to `site/` and deploys `main` to Cloudflare Pages (`docs/workflows/SITE.md`).
- Transcripts in seven formats (issue #21, ADR-041): plain text, SRT and VTT subtitles, LRC lyrics, CSV, TSV and JSON, all with whisper.cpp's timestamps except plain text. Save on the Transcribe page, Save all on the queue and Save a copy after a download each ask which format to save. Settings has a Transcript files row that picks the files written beside a transcribed file; plain text stays the default. `POST /api/v1/transcriptions` takes `formats`, and its `done` event carries `transcripts` and `outputPaths` instead of `outputPath`.

### Changed
- The website's Download buttons download the Windows installer directly, and the hero links the macOS and Linux installers and shows the current version (issue #22, ADR-042). The installers lost the version from their names (`KineTube-Setup.exe`, `KineTube-x64.dmg`, `KineTube-arm64.dmg`, `KineTube-x86_64.AppImage`), so `releases/latest/download/<name>` always serves the newest release. The release workflow redeploys the website when every installer is uploaded.
- Both GitHub Actions workflows use `actions/checkout@v7`, `actions/setup-node@v7` and, for releases, `softprops/action-gh-release@v3`, which run on Node 24 instead of the deprecated Node 20 (issue #19).
- The README animations are animated WebP files instead of GIFs, about 4.7 MB in total instead of 23 MB, so the README loads much faster on GitHub. `npm run demos` now runs `scripts/make-demos.mts` (issue #13, ADR-039).
- The README badges come from badgen.net. shields.io had run out of GitHub tokens and showed an error instead of the star count (issue #20).

### Fixed
- Opening the Theme menu in the sidebar, or the Download menu on a video in a playlist or channel, no longer leaves an empty window. Base UI throws when a menu label sits outside a menu group, and that error unmounted the whole app (issue #23).
- Transcribing a dropped file no longer leaves a `.txt` file in the system temp folder beside the deleted upload (issue #21).

## [2.0.0] - 2026-10-17

Every package is now version 2.0.0 (ADR-037). The macOS and Linux installers are built by the release workflow but have not been run on real hardware yet, so this release labels them untested.

### Added

**Playlists and channel tabs** (issue #2)
- Playlist links list every video in the playlist, so you can pick which to download. A video link that is part of a playlist offers to load the whole list. See ADR-034.
- Channels have Videos, Shorts, Live and Playlists tabs. Upcoming and running streams and private or deleted videos are shown but can't be picked.

**Redesign** (issue #1)
- A new interface in the kinetube brand, laid out like the ElevenLabs web app: a sidebar with the brand lockup, a top bar with breadcrumbs, and pages built from shared patterns. Light and dark themes both meet WCAG AA. See ADR-032 and `docs/design-reference.md`.
- Batch download is its own page in the sidebar.
- A command palette opens with Ctrl or Cmd and K: go to a page, change the theme, or paste a link to fetch it.
- The video view keeps the preview beside a download panel, and lists of videos have a search, filter chips and a bar that stays in reach.
- Settings has an Appearance section for the theme, and About shows the version.
- Toasts confirm saved settings, copied transcripts and logins, and dismissing an unfinished download can be undone. Removing an Instagram account or clearing the transcription queue needs a press and hold. See ADR-035.

**Folder picker on macOS and Linux** (issue #5)
- The browser fallback opens a native dialog with osascript on macOS and zenity or kdialog on Linux.

**A new README** (issue #11)
- The README is shorter and shows six animated GIFs of the real app, filmed with Flute, in place of the screenshots. The brand lockup at the top follows GitHub's light or dark theme, and two Mermaid diagrams show how the app is put together. See ADR-038.
- `CONTRIBUTING.md` covers setup, checks, builds and the project layout. `docs/USER_GUIDE.md` holds the settings, Instagram setup, keyboard shortcuts and known limitations that used to fill the README.
- `npm run demos` films the scenes in `frontend/src/flute/scenes/` again and rebuilds the GIFs in `docs/media/` (`docs/workflows/DEMOS.md`).

### Changed
- yt-dlp now checks TLS certificates on every lookup and download; `--no-check-certificates` is gone (issue #4).
- The app uses Unbounded and DM Sans, bundled with the app (ADR-033). Geist is removed.
- Folder and transcription errors give a path example for the system the app runs on.

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
- **UI bugs** (issue #3): the thumbnail on a video's card showed as an empty box; durations under a minute read "19" instead of "0:19"; every quality up to 4K was offered on low resolution videos; light colours appeared in the dark theme; the whole page scrolled, header included; the Instagram page promised 4K and a login it no longer uses; channel rows showed a bare number for views; the language selector covered its own field and opened without animation.
- **The desktop app opened on "Cannot GET /" when port 3001 was taken** (issue #10). Its own backend could not start, but a development backend or an older kinetube on the same port answered `/health`, and the window loaded a backend with no page. `/health` now says whether it serves the page, Electron loads only from one that does, and it shows the backend log as soon as its own backend exits.
- **A paused download showed as failed.** The stream reader treated the paused event as a cut connection.
- **The installer kept the 1.0.0 name and the packages disagreed on the version** (issue #7). Every package is 2.0.0 and the build is `KineTube-Setup-2.0.0.exe`.
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
- When a newer release is found, the button becomes "Update to `<version>`". Clicking it re-downloads that release in place, with a live progress bar, no manual file swap required. Works the same way across Windows, macOS, and Linux (each platform's own yt-dlp release asset).
- New routes, now `GET /api/v1/tools/ytdlp/releases/latest` (JSON) and `POST /api/v1/tools/ytdlp/update` (SSE download stream).
- Fixed a related bug this surfaced: the existing pinned-version "outdated" check used a plain inequality, so a binary updated *past* the pinned baseline via this new feature was incorrectly flagged as outdated again. It now only flags a binary that is genuinely older.
- See `DECISIONS.md` ADR-022.

---

## [1.5.1] - 2026-07-27

### Fixed
- **Pause (and Cancel) didn't actually stop a YouTube download.** Clicking Pause while a video or audio stream was downloading appeared to do nothing until the download reached the merge step, at which point the UI reported "Paused" even though the file had actually finished downloading and merging in full in the background. Root cause: yt-dlp's release binaries are PyInstaller "onefile" builds. The process Node spawns is a launcher that starts a second, separate process to do the real download and just waits on it, so killing only the launcher PID left the real work running as an orphan. A new process-tree helper (now `backend/src/lib/processTree.ts`) kills the entire process tree (`taskkill /pid <pid> /t /f` on Windows, a POSIX process-group kill elsewhere) instead of a plain `proc.kill()`. Applied to every yt-dlp-spawning kill site in the download and Instagram routes (since the TypeScript rewrite, every yt-dlp process starts and stops through `backend/src/managers/ytdlp/ytdlpProcess.ts`). Cancel had the identical defect and is fixed by the same change. See `DECISIONS.md` ADR-021.

---

## [1.5.0] - 2026-07-27

### Added

**Pause and Resume a download in progress**
- The progress modal (now `frontend/src/features/downloads/ProgressModal.tsx`) now shows a Pause button during an active single-video download, and a Resume button once paused.
- New route, now `POST /api/v1/downloads/:downloadId/pause`. Pause kills the yt-dlp process (the same mechanism Cancel already used) but keeps the pending-download record instead of clearing it, and sends a new `paused` SSE event instead of `done`. Resume replays the exact original request; yt-dlp continues the same partial file on its own.
- Pausing and force-closing the app compose for free: a paused download that's still paused when the app closes shows up in the resume-after-restart banner too, since both features share the same underlying record.
- Only single-video YouTube downloads are covered. There is no Pause button on bulk/sequential or Instagram downloads yet.
- See `DECISIONS.md` ADR-020.

---

## [1.4.1] - 2026-07-27

### Fixed
- **`npm run dev` crashed on startup before any window opened** with `TypeError: Cannot read properties of undefined (reading 'getVersion')` inside `electron-updater`. Root cause: `ELECTRON_RUN_AS_NODE=1` was present in the shell environment (commonly leaked by Electron-based terminals like VS Code/Cursor), which makes any Electron binary run as plain Node.js instead of the real Electron runtime, so `electron.app` never exists. `npm run dev`'s Electron step now runs through a new wrapper (now `scripts/run-electron.mts`) that strips this variable before spawning Electron. Only affects local development. Packaging (`dist:*`) and the installed app are unaffected. See `DECISIONS.md` ADR-018.

### Added

**Version display and manual update check in Settings**
- The About card in Settings now shows the running app version and a "Check for Updates" button, so a user isn't limited to the one automatic check five seconds after launch.
- New IPC channels: `get-app-version`, `check-for-updates`; `update-status` now also forwards `checking` and `not-available` events.
- The button is a no-op with a clear "only runs in a packaged build" message in dev, since `electron-updater` requires a packaged build's `app-update.yml`.
- See `DECISIONS.md` ADR-019.

### Documentation
- `README.md` was updated to reflect features shipped in v1.3.0 to v1.4.0 (resume downloads, in-app update check) and to correct two stale lines (instaloader's install method, whisper.cpp's per-platform install method). It had fallen behind for several releases.

---

## [1.4.0] - 2026-07-27

### Added

**Resume an interrupted download**
- If KineTube is closed (or crashes) while a single-video download is in progress, the next launch now offers to resume it instead of losing the progress. The pending-download store (now `backend/src/stores/pendingDownloadStore.ts`) records each in-flight download's request parameters and clears the record on any normal end (success, failure, or cancel); a leftover record can only mean the app itself was killed mid-download.
- New routes, now `GET /api/v1/downloads` and `DELETE /api/v1/downloads/:downloadId`.
- New resume banner (now `frontend/src/features/downloads/ResumeDownloadsBanner.tsx`), shown on the YouTube tab when a resumable download is found. "Resume" re-issues the exact original request; yt-dlp resumes its own partial `.part` file automatically.
- Bulk/sequential and Instagram downloads are not covered by this yet. See `ROADMAP.md`.
- See `DECISIONS.md` ADR-017.

### Changed

**Shared download helper**
- The yt-dlp and whisper.cpp managers (now under `backend/src/managers/ytdlp/` and `backend/src/managers/whisper/`) no longer each carry their own copy of the HTTPS/HTTP redirect-following, progress-reporting download function. Both now import `downloadFileWithProgress()` from a new shared module (now `backend/src/lib/httpDownload.ts`). The unified version is the more robust of the two prior copies (follows `http:` redirects, not just `https:`, and correctly rejects and cleans up on a response error mid-stream, which the yt-dlp copy did not). The dead, unused `downloadFile()` (no-progress variant) was deleted.
- See `DECISIONS.md` ADR-015.

**Centralized frontend request helpers**
- Added a shared request module (`getJSON`, `postJSON`, `postJSONStrict`, `postRequest`, `deleteRequest`; replaced in the TypeScript rewrite by `frontend/src/services/request.ts` and `frontend/src/services/api.ts`) and migrated every plain (non-SSE, non-streaming) `fetch()` call site to use it, removing the duplicated request-building/JSON-parsing/error-throwing boilerplate from each component. The call sites were the root `App` component, the download settings panel, the Settings page, the Instagram login dialog and the Transcribe page, now `frontend/src/App.tsx` (and the files split out of it), `frontend/src/features/downloads/DownloadSettingsPanel.tsx`, `frontend/src/features/settings/SettingsPage.tsx`, `frontend/src/features/instagram/InstagramLoginModal.tsx` and `frontend/src/features/transcribe/TranscribePage.tsx`.
- SSE (`EventSource`) consumption and the two call sites needing a raw `Response` (file upload via `FormData`, streaming-response transcription) are unchanged by design.
- See `DECISIONS.md` ADR-016 (supersedes ADR-006).

### Fixed
- A stray corrupted line in `ROADMAP.md`'s Known Issues section (mismatched markdown bold/italic markers) was restored.
- A missing `@testing-library/react` cleanup registration meant component tests that query the DOM by role/position (rather than unique text) could silently match elements left over from a previous test in the same file. Added a global test setup file (now `frontend/tests/setup.ts`, wired via `test.setupFiles` in `frontend/vite.config.ts`) to register `afterEach(cleanup)` globally.

### Tests
- Shared download helper tests (now `backend/tests/lib/httpDownload.test.ts`), run against a local throwaway HTTP server (redirects, redirect-limit exhaustion, non-200 responses, mid-stream connection drops, missing destination directory)
- Resume registry tests (now `backend/tests/stores/pendingDownloadStore.test.ts`): id stability, title updates, removal, corrupt/missing state file
- Route tests (now in `backend/tests/routes/apiRoutes.test.ts`) for the pending-download list and dismiss routes, now `GET /api/v1/downloads` and `DELETE /api/v1/downloads/:downloadId`
- Tests for every request helper (now `frontend/tests/services/request.test.ts`)
- Resume banner tests (now `frontend/tests/features/downloads/ResumeDownloadsBanner.test.tsx`): render states and Resume/Dismiss callbacks

---

## [1.3.1] - 2026-07-26

### Fixed
- **Auto-update 404 on Windows.** `v1.3.0`'s in-app updater failed with `Cannot download "...KineTube-Setup-1.3.0.exe", status 404`. The unset NSIS `artifactName` default (`${productName} Setup ${version}.${ext}`, with a literal space) got sanitized two different, incompatible ways: electron-builder wrote a dash-separated name into `latest.yml` while GitHub's asset upload API rewrote the same spaces to dots on the actual uploaded `.exe`. Pinned `build.nsis.artifactName` to `${productName}-Setup-${version}.${ext}` (no spaces) in `package.json` so both names converge. See `DECISIONS.md` ADR-014.
- **Update-failed dialog text overflow.** A long error message (e.g. the download URL in the 404 above) could overflow past the fixed-width update dialog instead of wrapping. Added `break-words` to the shared `DialogDescription` primitive (now `frontend/src/components/ui/dialog.tsx`) so long unbroken strings wrap inside any dialog, not just this one.

---

## [1.3.0] - 2026-07-26

### Added

**Cross-platform tool support (yt-dlp, ffmpeg, whisper.cpp)**
- yt-dlp now downloads the correct standalone binary per platform (`yt-dlp.exe` / `yt-dlp_macos` / `yt-dlp_linux`) from the same pinned GitHub release, with `chmod 755` applied on macOS/Linux (now `backend/src/managers/ytdlp/ytdlpBinary.ts`)
- ffmpeg now downloads from gyan.dev (Windows, unchanged), evermeet.cx's stable release-redirect zip (macOS x64, relies on Rosetta 2 for Apple Silicon), or johnvansickle.com's static `tar.xz` build (Linux x64, extracted by shelling out to the system `tar` command) (now `backend/src/managers/ffmpeg/ffmpegBinary.ts` and `backend/src/managers/ffmpeg/ffmpegManager.ts`)
- whisper.cpp now builds from source on macOS/Linux (`git clone` the pinned tag, `cmake -B build` + `cmake --build`), since ggml-org does not publish official prebuilt binaries for those platforms and this project declines to depend on unofficial third-party binary distributors; fails with an actionable error if `git`/`cmake` are missing (now `backend/src/managers/whisper/whisperBuild.ts`)
- New pure, platform-keyed resolver functions exported for testability: `getYtdlpAssetName`, `getYtdlpBinaryName`, `getYtdlpDownloadUrl`, `getFfmpegBinaryName`, `getFfmpegDownloadInfo`, `getWhisperBinaryName`. They are now in `backend/src/managers/ytdlp/ytdlpBinary.ts`, `backend/src/managers/ffmpeg/ffmpegBinary.ts` and `backend/src/managers/whisper/whisperBinary.ts`, named without the `get` prefix
- `docs/philosophy/CROSS_PLATFORM.md` rewritten with a per-tool, per-platform verification-status table, full source citations, and the reasoning behind each platform-support decision (see `DECISIONS.md` ADR-011 and ADR-012)

**Instagram cross-platform correction**
- Removed the dead Windows-only `instaloader.exe` download path (`ensureInstaloader`, `getInstaloaderPath`, `isInstaloaderReady`, and the `GET /api/instagram/setup` / `GET /api/instagram/setup/check` routes, which have no `/api/v1` replacement). It was unreachable from the frontend and had been fully superseded by the existing `pip install instaloader` + Python-module flow, which was already cross-platform with no code changes needed (see `DECISIONS.md` ADR-010)

**Backend testability**
- The backend entry file now exports the Express `app` and only auto-starts (`app.listen` + binary checks) when run as the process entry point (`require.main === module`), so it can be driven directly with `supertest` in tests without binding a port (see `DECISIONS.md` ADR-013). The TypeScript rewrite split this into `backend/src/app.ts`, which builds the app, and `backend/src/server.ts`, which starts it
- Added `supertest`-based route integration tests (now `backend/tests/routes/apiRoutes.test.ts`) for the routes now at `GET /health`, `GET /api/v1/tools/ytdlp`, `GET /api/v1/youtube/media` (validation), `GET /api/v1/folders/:folderPath`, `GET /api/v1/tools/whisper`, `GET /api/v1/whisper-models`, `GET /api/v1/instagram/accounts`, and `GET /api/v1/images` (allow-list enforcement)
- Added unit tests for the new yt-dlp/ffmpeg platform-resolution functions across `win32`/`darwin`/`linux` (now `backend/tests/managers/ytdlp/ytdlpBinary.test.ts` and `backend/tests/managers/ffmpeg/ffmpegBinary.test.ts`)
- Extended the whisper.cpp manager tests (now `backend/tests/managers/whisper/whisperManager.test.ts`) with `getWhisperBinaryName()` coverage
- Added `supertest` as a backend devDependency

**Frontend testability**
- Extracted `cleanYouTubeUrl()`/`cleanInstagramUrl()` out of the root `App` component into a shared module (now `frontend/src/lib/urlCleaners.ts`) so they're unit-testable in isolation; the `App` component imported them from there
- Added unit tests for both URL cleaners across every supported URL shape (now `frontend/tests/lib/urlCleaners.test.ts`)
- Added component tests for the progress modal (now `frontend/tests/features/downloads/ProgressModal.test.tsx`) covering null render, single-download progress/done/failure/transcribe-button states, and bulk-download totals/status using `@testing-library/react`
- Added `@testing-library/react` and `@testing-library/dom` as frontend devDependencies

**Documentation suite**
- `CLAUDE.md`: the root AI operating manual, covering project identity, reading order, documentation map, engineering standards, MCP usage rules, documentation maintenance policy. To be read before any task in this repository.
- `docs/WRITING_STANDARDS.md`: typography, icon, writing style, UI copy, and commit message rules
- `docs/architecture/OVERVIEW.md`: process topology, dev vs. packaged startup, request lifecycles (metadata fetch and SSE download), data storage strategy, architectural invariants
- `docs/architecture/electron/MAIN_PROCESS.md`: window lifecycle, backend process management, auto-updater, full IPC surface table
- `docs/architecture/backend/EXPRESS.md`: app structure, CORS policy, image proxy allow-list, static frontend serving, startup sequencing
- `docs/architecture/backend/ROUTES.md`: full route table for `info`, `download`, `setup`, `transcribe`, and `instagram` routers
- `docs/architecture/backend/MANAGERS.md`: shared tool-manager contract and per-manager specifics (yt-dlp, ffmpeg, whisper.cpp, instaloader)
- `docs/architecture/frontend/REACT_ARCHITECTURE.md`: component tree, state management approach, backend communication patterns, Electron bridge usage
- `docs/guidelines/TYPESCRIPT.md` (then the JavaScript guideline), `docs/guidelines/REACT.md`, `docs/guidelines/NAMING.md`, `docs/guidelines/ERROR_HANDLING.md`: code standards, including the shared SSE `phase`/`progress`/`done`/`error` event contract
- `docs/workflows/FEATURE_DEVELOPMENT.md`, `docs/workflows/TESTING.md`, `docs/workflows/GIT.md`, `docs/workflows/RELEASE.md`: implementation sequence, test strategy, commit conventions, and the electron-builder/GitHub Actions release flow
- `docs/features/NEW_API_ROUTE.md`, `docs/features/NEW_TOOL_MANAGER.md`: step-by-step guides for the two most common extension points
- `docs/philosophy/ARCHITECTURE.md`: core architectural principles and when it's acceptable to break them
- `docs/philosophy/CROSS_PLATFORM.md`: per-tool, per-platform cross-platform support breakdown and verification status
- `docs/mcp/OVERVIEW.md`: decision guide for Context7 / Filesystem / Sequential Thinking / Parallel Search in this project
- `DECISIONS.md`: architectural decision log
- `ROADMAP.md`: prioritized gaps and planned work

**Automated tests**
- Backend: `node:test` wired up via `npm test` (`backend/package.json`)
  - YouTube URL parser tests (now `backend/tests/platforms/youtube/youtubeUrl.test.ts`): every supported YouTube URL shape and invalid input
  - Instagram URL parser tests (now `backend/tests/platforms/instagram/instagramUrl.test.ts`): post/reel/story/profile/profile-tab URLs, tracking-param stripping, and reserved-path rejection
  - whisper.cpp manager tests (now `backend/tests/managers/whisper/whisperManager.test.ts`): `cleanTranscription()` timestamp stripping and paragraph collapsing, `MODELS` registry shape, `getModelPath()`/`getWhisperBinaryName()` resolution
  - Path tests (now `backend/tests/config.test.ts`): confirms the downloads, models and sessions folders resolve under `ELECTRON_USER_DATA` when set and fall back to the backend-relative default in dev
  - Exported `cleanTranscription()` from the whisper.cpp manager (previously private) so it can be tested directly. It is now in `backend/src/managers/whisper/whisperTranscript.ts`
- Frontend: Vitest + jsdom wired up via `npm test` (`frontend/package.json`), configured in the Vite config (now `frontend/vite.config.ts`)
  - Tests for `cn()`'s class-name joining, conditional/falsy handling, and Tailwind conflict resolution (removed in the TypeScript rewrite)
- Root `npm test` runs both suites in sequence (`npm run test:backend && npm run test:frontend`)

### Fixed
- Two empty `catch {}` blocks in the root `App` component flagged by the existing `no-empty` ESLint rule (added explanatory comments, matching the pattern already used elsewhere in the codebase)

---

## [1.2.0] - 2026-06-25

### Added
- Auto-update dialog (`UpdateDialog`, now `frontend/src/components/UpdateDialog.tsx`) built with shadcn UI, wired to `electron-updater`: checks GitHub Releases 5 seconds after startup in packaged builds, shows a version badge and download progress bar, and locks the dialog during download so it can't be dismissed mid-update
- GitHub Actions release workflow now also uploads the `latest*.yml` metadata files `electron-updater` requires to detect new versions

## [1.1.0] - 2026-06-25

### Fixed
- Extracted `ThumbGridItem` as its own component to fix a React rules-of-hooks violation (`useState` was being called inside `.map()`)
- Fixed the indeterminate state of the bulk-selection checkbox in `MultiCard` to use shadcn's `checked="indeterminate"` prop instead of a manual workaround
- Fixed a stale-closure bug in `handlePlatformChange` by adding `platform` to its dependency array
- Wired `SettingsPage`'s `onSave` prop to a new `syncDownloadSettings` callback so saved settings apply immediately without navigating away
- Removed dead state (`igSetupReady`, `igSetupLoading`) left over from the sidebar migration, an unused `Separator` import in the root `App` component, and the now-fully-orphaned `Navbar` component

## [1.0.0] - 2026-06-18

Initial release: a working Electron + Express + React desktop app for downloading YouTube and Instagram media and transcribing it locally with Whisper.

### Added

**Backend**
- Express entry point (now `backend/src/server.ts`) listening on port 3001
- YouTube video/channel metadata via yt-dlp (now `GET /api/v1/youtube/media`)
- SSE-streamed download with real-time progress (now `POST /api/v1/downloads`)
- SSE-streamed first-run yt-dlp/ffmpeg installation (now `POST /api/v1/tools/:toolId/install`)
- yt-dlp/ffmpeg manager with progress-aware download (now `backend/src/managers/ytdlp/` and `backend/src/managers/ffmpeg/`)
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
