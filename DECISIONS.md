# Architectural Decision Log

Records every significant architectural decision, the alternatives considered, and the reasoning. Append new entries. Never modify or delete existing ones.

---

## ADR-001: Electron + Express, not a single-process Electron app

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** Run a full Express HTTP server as a child process of the Electron main process, rather than doing all download/transcription/scraping logic directly in the main process.

**Alternatives considered:**
- All logic in the Electron main process, IPC-driven from the renderer
- A single Node.js CLI tool with an Electron shell around it

**Reasoning:**
- Route handlers, SSE streaming, and static file serving are a natural fit for a well-understood HTTP framework (Express) rather than reimplementing request routing over IPC
- The backend can be developed and smoke-tested independently of Electron (`node src/server.ts` in `backend/`, `curl`), which was useful while the app had no automated integration test suite
- Keeps the main process focused on window/OS-level concerns

**Trade-offs:**
- Two runtimes to reason about (main process vs. backend child process) instead of one
- Requires a readiness wait before navigating the window (now `waitForBackend()` in `electron/src/backendProcess.ts`)

---

## ADR-002: `utilityProcess.fork`, not `child_process.spawn`, for the packaged backend

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** Use Electron's `utilityProcess.fork()` to start the Express backend in a packaged build, instead of `child_process.spawn('node', [...])`.

**Alternatives considered:**
- `child_process.spawn` invoking a system Node.js binary
- Running the backend logic in-process in the main process (see ADR-001)

**Reasoning:**
- A packaged app cannot assume the end user has Node.js installed; `utilityProcess.fork` runs the backend inside Electron's own bundled Node.js runtime
- Matches Electron's recommended pattern for background Node.js work in a packaged app (per Electron's own documentation, verified via Context7 when this was implemented)

**Trade-offs:**
- Only available in Electron >= 22; not a concern here since the app targets Electron 33
- `stdio: 'pipe'` output must be manually forwarded to the app's log file (`writeLog()`, now in `electron/src/backendLog.ts`) rather than inheriting the parent's console automatically

---

## ADR-003: Managed external tools, downloaded at runtime, excluded from the installer

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** yt-dlp, FFmpeg, whisper.cpp, and instaloader are not bundled into the electron-builder output. `extraResources.filter` in `package.json` explicitly excludes their binaries, and each is downloaded into the writable data root on first use via a manager in `backend/src/managers/`.

**Alternatives considered:**
- Bundle all four tools into the installer for every platform
- Bundle only yt-dlp/ffmpeg (small, frequently updated) and require the user to install whisper.cpp/instaloader manually

**Reasoning:**
- yt-dlp needs frequent updates to keep working against YouTube's changes; a bundled binary would go stale between app releases
- Combined size of all four tools plus whisper models would make the installer very large for users who may only want a subset of features
- Runtime download means yt-dlp/ffmpeg/whisper.cpp/instaloader can each update on their own cadence

**Trade-offs:**
- The app is non-functional on first launch until setup completes and the user has a working internet connection
- As implemented, every manager's download logic is Windows-only. See `docs/philosophy/CROSS_PLATFORM.md` for the resulting gap on macOS/Linux
- No automated test coverage for the download/extract/spawn path itself, since it depends on the network and on subprocesses. See `docs/workflows/TESTING.md`

---

## ADR-004: `backend/src/lib/paths.ts` as the single writable-data-root resolver

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** All backend code that needs a writable path (downloaded binaries, whisper models, Instagram sessions) gets it from `backend/src/lib/paths.ts` (`createAppPaths()`, which builds `downloadsDir`, `modelsDir` and `sessionsDir`). The data root these sit under is `app.getPath('userData')` when `ELECTRON_USER_DATA` is set (packaged) and `backend/` itself otherwise (dev); `backend/src/config.ts` makes that choice.

**Alternatives considered:**
- Each manager resolving its own path relative to `__dirname`
- A single global constant duplicated across files

**Reasoning:**
- A packaged Windows app installed under `Program Files` cannot write into its own installation directory without elevated permissions; every manager independently discovering this would be error-prone
- Centralizing the resolution means the dev/packaged distinction is handled in exactly one place

**Trade-offs:**
- Anything that bypasses `backend/src/lib/paths.ts` and hardcodes a path relative to its own file will silently work in dev and break in a packaged build. This is the most common regression class in this codebase's history and is called out explicitly in `CLAUDE.md`'s security invariants and the "Rules that hold everywhere" list in `docs/architecture/OVERVIEW.md`

---

## ADR-005: SSE for all long-running operations, not WebSockets or polling

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** Downloads, transcription, and first-run tool setup stream progress to the frontend using Server-Sent Events (a plain `text/event-stream` response with `phase`/`progress`/`done`/`error` events), not WebSockets or client-side polling.

**Alternatives considered:**
- WebSockets (bidirectional, but this app never needs the client to push mid-stream)
- Polling a status endpoint every N seconds

**Reasoning:**
- All communication in these flows is one-directional (backend -> frontend); SSE is the simplest primitive that fits, built on plain HTTP with no extra dependency
- Polling would add latency and unnecessary request volume for what are often multi-minute operations (large downloads, transcription, big model downloads)

**Trade-offs:**
- Each streaming route hand-rolls its own SSE writer (`res.write(\`event: ...\ndata: ...\n\n\`)`) rather than using a shared middleware. That is acceptable given there are only a handful of these routes; revisit if the count grows significantly

---

## ADR-006: No central API client layer in the frontend

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** Frontend components call `fetch()` directly against `/api/...` paths rather than going through a shared API client module.

**Alternatives considered:**
- A single API module exporting one function per backend endpoint (common pattern in larger SPAs)

**Reasoning:**
- The app has no auth headers, no shared base URL logic beyond same-origin/dev-proxy (handled by Vite's proxy config), and a small enough number of endpoints that a central module would mostly be indirection without meaningfully reducing duplication
- SSE consumption in particular benefits from being colocated with the component that renders its progress, rather than abstracted behind a generic client

**Trade-offs:**
- If the number of distinct backend calls grows substantially, or auth/base-URL logic is ever introduced, revisit this and introduce a shared API module, and track that reconsideration in `ROADMAP.md` if it becomes relevant. ADR-016 did this, and ADR-027 finished it with `frontend/src/services/api.ts`

---

## ADR-007: No TypeScript

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** The entire project (Electron main process, Express backend, React frontend) is plain JavaScript/JSX.

**Alternatives considered:**
- TypeScript throughout
- TypeScript for the backend only

**Reasoning:**
- Keeps the backend's CommonJS setup simple (no build step required to start the backend with Node)
- The project is small enough that `docs/guidelines/NAMING.md` and consistent patterns provide adequate clarity without static types

**Trade-offs:**
- No compile-time type safety across the Electron IPC boundary or the SSE event payloads. Mismatches surface at runtime, not build time

---

## ADR-008: `node:test` and Vitest for automated tests, not Jest/Mocha

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Backend unit tests use Node's built-in `node:test` + `node:assert/strict` (zero new dependencies). Frontend unit tests use Vitest (Vite-native, minimal config on top of the existing Vite config, now `frontend/vite.config.ts`).

**Alternatives considered:**
- Jest for both layers (most common choice, but adds a heavier dependency and a separate transform pipeline that duplicates what Vite already does for the frontend)
- Mocha + Chai for the backend

**Reasoning:**
- The backend is plain CommonJS targeting a Node runtime that already ships a capable built-in test runner (Node 18+; this project runs on Node 22 in the reference dev environment and Electron 33's bundled Node), so adding Jest would be a new dependency for something the runtime already provides
- Vitest reuses the frontend's existing Vite config and ESM setup with minimal added configuration, and is the natural pairing for a Vite + React 19 frontend

**Trade-offs:**
- `node:test` has a smaller assertion/matcher ecosystem than Jest. That is acceptable given the initial test surface (pure functions: URL parsers, text cleanup, path resolution) needs only `node:assert/strict`
- Two different test runners across the two layers, rather than one. That is acceptable given the backend and frontend already use two different module systems (CommonJS vs. ESM) and have no shared test infrastructure need

---

## ADR-009: Documentation suite modeled as a `CLAUDE.md` + `docs/` hub-and-spoke, read before every task

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Introduce a root `CLAUDE.md` as the single entry point for AI-assisted work on this repository, with a `docs/` tree of architecture, guideline, workflow, feature, and philosophy documents it points to. The user has directed that `CLAUDE.md` be read before every task in this repository going forward.

**Alternatives considered:**
- A single large `CONTRIBUTING.md` covering everything
- No formal documentation structure; rely on reading code directly each time

**Reasoning:**
- The codebase has non-obvious cross-cutting constraints (the dev/packaged path split, the SSE event contract, the Windows-only tool managers) that are easy to violate by accident if each change is made from a fresh reading of only the immediately touched files
- A hub-and-spoke structure lets a change touching one layer (e.g. a new tool manager) pull in exactly the docs relevant to it, rather than requiring one document to cover everything at once

**Trade-offs:**
- Documentation now requires active maintenance discipline (see `CLAUDE.md`'s Documentation Maintenance Policy table). Stale docs referenced by the map would be worse than no map at all, since they'd be trusted and wrong

---

## ADR-010: Removed the dead Windows-only `instaloader.exe` download path

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Deleted `ensureInstaloader()`, `getInstaloaderPath()`, `isInstaloaderReady()`, `INSTALOADER_EXE`, `INSTALOADER_VERSION`, and `INSTALOADER_ZIP_URL` from the instaloader manager (now `backend/src/managers/instaloader/instaloaderManager.ts`), and removed the `GET /api/instagram/setup` and `GET /api/instagram/setup/check` routes that called them. Both routes were removed outright and have no `/api/v1` replacement.

**Alternatives considered:**
- Make the standalone-exe path cross-platform (find/build equivalent macOS/Linux binaries)
- Leave it in place as a legacy/unused fallback

**Reasoning:**
- Grepping the entire frontend confirmed no component ever called `/api/instagram/setup` or `/api/instagram/setup/check`. The Instagram login dialog (now `frontend/src/features/instagram/InstagramLoginModal.tsx`) only called the Python check and the `pip install instaloader` route (now `GET /api/v1/tools/instaloader` and `POST /api/v1/tools/instaloader/install`)
- The root `App` component of the time (since split into `frontend/src/App.tsx`, `frontend/src/AppShell.tsx` and the feature folders) already had a comment saying that `instaloader.exe` was no longer required, because Python and the instaloader library handle everything
- The real Instagram scraping flow (`detectPython()`, `loginWithPython()`, `backend/python/instaloader_login.py`/`backend/python/instaloader_profile.py`) has been Python-module-based, and therefore already cross-platform, for some time. The dead code was actively misleading anyone auditing platform support, since it made instaloader look like a fourth Windows-only gap when it was not
- The "No unused code" rule (now in `docs/guidelines/TYPESCRIPT.md`) and `getInstaloaderPath` being imported-but-never-called made this an unambiguous deletion, not a judgment call

**Trade-offs:**
- None identified. This is pure removal of unreachable code plus the two routes that only ever called it

---

## ADR-011: yt-dlp and ffmpeg cross-platform sources

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** The yt-dlp manager now resolves a platform-specific download source for both tools (today the yt-dlp sources live in `backend/src/managers/ytdlp/ytdlpBinary.ts` and the ffmpeg sources in `backend/src/managers/ffmpeg/ffmpegBinary.ts`):
- yt-dlp: the same pinned GitHub release's platform-specific standalone binary (`yt-dlp.exe` / `yt-dlp_macos` / `yt-dlp_linux`)
- ffmpeg: gyan.dev (Windows, unchanged), evermeet.cx's stable release-redirect zip (macOS, x64 only), johnvansickle.com's static tar.xz (Linux x64)

**Alternatives considered:**
- Bundle a cross-platform npm package like `ffmpeg-static` instead of managing the download ourselves
- Support Apple Silicon natively via osxexperts.net instead of relying on Rosetta 2
- Use a different Linux extraction approach (an npm `tar` package + separate xz-decompression library) instead of shelling out to the system `tar` binary

**Reasoning:**
- These are exactly the sources the `ffmpeg-static` npm package (1,300+ GitHub stars, widely used in Electron apps) uses internally, verified via its `build/index.sh`, so this isn't a novel or unvetted choice
- Bundling `ffmpeg-static` as a dependency would pull its own binary download at `npm install` time, which conflicts with this project's existing pattern of downloading managed tools into the user's data directory at first app run, not at build time (see ADR-003)
- evermeet.cx publishes a documented, stable, version-agnostic redirect URL (`/ffmpeg/getrelease/ffmpeg/zip`); osxexperts.net's Apple Silicon builds only exist at version-specific filenames (e.g. `ffmpeg81arm.zip`) with no stable "latest" URL. Even `ffmpeg-static` itself hardcodes a specific, aging osxexperts filename rather than trying to track their latest release automatically. Relying on Rosetta 2 (which macOS auto-installs on first x64 binary execution) avoids introducing a URL that would silently go stale between whisper.cpp app releases.
- `tar` and `xz-utils` are present on essentially every Linux distribution by default; adding an npm `tar` package would still require a separate xz-decompression library (Node's built-in `zlib` does not support xz/lzma), so shelling out to the system `tar -xJf` is less code and no new dependency, at the cost of assuming `tar` is on `PATH`

**Trade-offs:**
- Linux target is x86_64 only (`ffmpeg-release-amd64-static.tar.xz`); `arm64`/`armhf` Linux builds exist at johnvansickle.com but are not wired up
- macOS Apple Silicon users get an x64 binary running under Rosetta 2 rather than a native arm64 binary: slightly worse performance for ffmpeg operations, traded for not having a static build source with a stale-URL problem
- If `tar` is ever missing from a target Linux system (uncommon, but possible on a minimal container base image), ffmpeg setup fails with an explicit error naming the problem rather than silently working

---

## ADR-012: whisper.cpp builds from source on macOS/Linux instead of using an unofficial prebuilt binary

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** On macOS and Linux, the whisper.cpp manager (the build steps are now in `backend/src/managers/whisper/whisperBuild.ts`) clones the pinned `whisper.cpp` tag and builds it locally with `cmake` (requiring `git`, `cmake`, and a C/C++ toolchain already on the machine), rather than downloading a prebuilt binary.

**Alternatives considered:**
- Download prebuilt binaries from `jiang1997/whisper.cpp-release`, a third-party GitHub repo that does publish cross-platform prebuilt whisper.cpp binaries via its own CI
- Wait for ggml-org (the upstream project) to publish official macOS/Linux binaries
- Ship a bundled precompiled binary per platform as part of the KineTube release itself

**Reasoning:**
- ggml-org's own GitHub releases (`https://github.com/ggml-org/whisper.cpp/releases`) confirmed to only publish Windows zips and WASM/xcframework artifacts. There is no official macOS/Linux CLI binary to point at
- `jiang1997/whisper.cpp-release` was created 2026-05-14, has 0 stars, and is maintained by a single individual with no track record. Downloading and executing an arbitrary binary from a brand-new, unaudited, single-maintainer source on every user's machine is a supply-chain risk this project declines to take, independent of whether that specific repo is currently trustworthy. The risk is in depending on it going forward with no ability to audit changes
- Building from source uses only the upstream project's own repository and a locally-installed, user-controlled toolchain (`git`, `cmake`, a compiler). Nothing is trusted except ggml-org's own source code, the same trust boundary the Windows path already has (an official ggml-org-published binary)

**Trade-offs:**
- This is meaningfully heavier than the other three tools: it requires a full C/C++ compiler toolchain already present on the machine (Xcode Command Line Tools on macOS, `build-essential` or equivalent on Linux), not just `git` and `cmake`. A missing compiler surfaces as a raw `cmake`/build error rather than a friendly upfront message, since verifying "is there a working C++ compiler" robustly across all Linux distributions and macOS versions is nontrivial. This is tracked as a rough edge in `docs/philosophy/CROSS_PLATFORM.md`
- A source build takes meaningfully longer than downloading a prebuilt zip (multi-minute compile vs. a fast download). The SSE progress events reflect discrete phases (`cloning`, `configuring`, `building`) rather than a fine-grained percentage, since `cmake --build` doesn't expose one
- Not yet verified on real macOS/Linux hardware in this session (this dev environment is Windows-only). See the verification table in `docs/philosophy/CROSS_PLATFORM.md`

---

## ADR-013: The backend entry file exports the Express `app`, guarded by `require.main === module`

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** The 1.x backend entry file now does `module.exports = app;` right after all routes/middleware are registered, and only calls `startServer()` (port bind + binary setup checks) inside `if (require.main === module) { ... }`. The TypeScript rewrite replaced this guard with two files: `backend/src/app.ts` builds the app with `createApp()` and never listens, and `backend/src/server.ts` is the entry point that starts it (see `docs/architecture/backend/EXPRESS.md`).

**Alternatives considered:**
- Leave the entry file as an entry-point-only script and write a separate app module that both the entry file and tests import (the shape the TypeScript rewrite later adopted, as noted above)
- Test only via a real running server (start the backend with Node as a child process in a test harness, hit it over HTTP)

**Reasoning:**
- `require.main === module` is Node's standard, well-understood idiom for "this file's own code should only auto-run when it's the process entry point". It needed no restructuring of the existing single-file layout, just moving the export earlier and adding the guard
- It is true for both of this file's actual entry-point invocations (running it with `node` in dev, Electron's `utilityProcess.fork(getServerPath())` in a packaged build) and false when a test file does `require('../server')`, which is exactly the distinction needed
- A separate app module would have been a bigger diff for no behavioral benefit, and spinning up a real child-process server per test run would be slower and flakier (port collisions, startup race conditions) than driving the in-process `app` object with `supertest`

**Trade-offs:**
- Anyone reading the entry file for the first time needed to know this idiom; it was called out explicitly in a comment at the export site and documented in `docs/architecture/backend/EXPRESS.md` at the time
- Adds `supertest` as a new backend devDependency (see `docs/workflows/TESTING.md`), the one exception to this project's general zero-new-test-dependency preference for the backend. It is justified because there is no way to drive Express routes via `node:test` alone without either this pattern or a real bound port

---

## ADR-014: Pinned `nsis.artifactName` to a space-free pattern to fix a broken auto-updater

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Set `build.nsis.artifactName` in `package.json` (root) to `${productName}-Setup-${version}.${ext}` instead of leaving it unset (electron-builder's NSIS default: `${productName} Setup ${version}.${ext}`, with literal spaces).

**Root cause found:** v1.3.0's in-app updater failed with `Cannot download ".../KineTube-Setup-1.3.0.exe", status 404`. This release workflow runs `electron-builder` with `--publish never` and then separately uploads `dist/*.exe` via `softprops/action-gh-release`. It never goes through electron-builder's own GitHub publish plugin, which is the only path that renames a built artifact to match the space-free name it also writes into `latest.yml`. Two independent things happened to the same unset-default filename (`KineTube Setup 1.3.0.exe`) and produced two different results: electron-builder's own `computeSafeArtifactNameIfNeeded()` (`app-builder-lib/out/platformPackager.js`) replaced the spaces with dashes when writing `dist/latest.yml` (`KineTube-Setup-1.3.0.exe`), while GitHub's release-asset upload API silently rewrote the same spaces to dots when the raw file was uploaded (`KineTube.Setup.1.3.0.exe`). `electron-updater` reads the dash name from `latest.yml`, requests it from the release, and gets a 404 because the asset that actually exists has dots.

**Alternatives considered:**
- Have the CI step rename `dist/*.exe` to strip spaces before upload, matching whatever electron-builder happened to write into `latest.yml`
- Switch the workflow to let electron-builder publish directly (`--publish always`) instead of a separate upload step

**Reasoning:**
- Pinning `artifactName` to an already GitHub-safe pattern (no spaces) makes `computeSafeArtifactNameIfNeeded()` a no-op (the suggested name is already safe, so `latest.yml` uses the real installer filename verbatim) and means GitHub's own upload sanitization has nothing to rewrite. Both names converge on the same string with no second system in the loop
- A CI-side rename step would work but leaves the underlying default (a space-containing filename) as a trap for the next platform target or config change
- Switching to `--publish always` is a larger change to the release flow (electron-builder would then own asset upload/retry/auth end-to-end) that isn't warranted just to fix a filename mismatch

**Trade-offs:**
- Anyone adding another Windows target (e.g. a portable build) needs to keep its `artifactName` space-free too, or this class of bug reappears. This is called out in `docs/workflows/RELEASE.md`'s Auto-Update section
- Every future release must be spot-checked (`latest*.yml` filename vs. actual uploaded asset filename) until this is caught by an automated CI check instead of manual verification (tracked in `ROADMAP.md`)

---

## ADR-015: Extracted `downloadFileWithProgress()` into a shared download module (now `backend/src/lib/httpDownload.ts`)

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** The yt-dlp and whisper.cpp managers no longer each define their own copy of the HTTPS/HTTP redirect-following, progress-reporting download function. Both now import `downloadFileWithProgress()` from a new shared module, now `backend/src/lib/httpDownload.ts` (imported today by the yt-dlp, ffmpeg and whisper.cpp managers under `backend/src/managers/`). The dead, never-called, never-exported `downloadFile()` (no-progress variant) in the yt-dlp manager was deleted outright rather than migrated, since nothing used it.

**Alternatives considered:**
- Leave the duplication in place (the original position in ADR-003's trade-offs and `ROADMAP.md`, pending "a fifth consumer or a cross-cutting bug fix")
- Extract only a subset (e.g. keep the simpler yt-dlp version, drop whisper's extra robustness)

**Reasoning:**
- The two copies had already drifted: whisper.cpp's version supported both `http:` and `https:` redirect targets (Hugging Face model downloads sometimes redirect through plain `http:`), guarded against double-resolve/reject with a `settled` flag, and explicitly handled a response-stream `error` event by destroying the partial file. The yt-dlp copy did none of these, meaning a dropped connection mid-download would have left an unresolved, hanging promise instead of a rejection. That is exactly the "bug fix needs to be applied in more than one place" trigger `ROADMAP.md` named as the reason to extract.
- The unified implementation is the whisper.cpp version verbatim (the more correct one), so the yt-dlp manager gained the missing robustness for free rather than whisper.cpp losing anything.
- Both managers already only used the progress-reporting variant. The yt-dlp manager's non-progress `downloadFile()` had no remaining callers, so it was deleted rather than carried into the shared module.

**Trade-offs:**
- None identified. This is a pure de-duplication with no behavior change for either manager's existing call sites.
- Covered by the shared helper's tests, now `backend/tests/lib/httpDownload.test.ts` (redirects, redirect-limit exhaustion, non-200 responses, mid-stream connection drops, missing destination directories), which is now the only place this logic needs to be tested instead of being implicitly exercised through two managers' setup flows.

---

## ADR-016: Centralized frontend request helpers for plain fetch endpoints

**Date:** 2026-07-27
**Status:** Supersedes ADR-006

**Decision:** Added `getJSON`, `postJSON`, `postJSONStrict`, `postRequest`, and `deleteRequest` helpers in a new frontend request module, and migrated every component's plain (non-SSE, non-FormData, non-streaming-response) `fetch()` call to use them: the root `App` component, the download settings panel, the Settings page, the Instagram login dialog and the Transcribe page. The TypeScript rewrite replaced these helpers with `frontend/src/services/request.ts` and `frontend/src/services/api.ts` (ADR-027). The components are now `frontend/src/App.tsx` (and the files split out of it), `frontend/src/features/downloads/DownloadSettingsPanel.tsx`, `frontend/src/features/settings/SettingsPage.tsx`, `frontend/src/features/instagram/InstagramLoginModal.tsx` and `frontend/src/features/transcribe/TranscribePage.tsx`.

**Alternatives considered:**
- Leave `fetch()` calls inline in every component, as ADR-006 originally decided
- A single opinionated `apiRequest()` that always throws on `!res.ok`, forcing every call site onto one error contract

**Reasoning:**
- ADR-006 explicitly named its own reconsideration trigger: "if the number of distinct backend calls grows substantially... revisit." The app now has roughly 20 fetch/EventSource call sites across 6 components, calling around 15 distinct endpoints, well past where it was when ADR-006 was written.
- The 1.x backend did not have one uniform response contract: some routes always returned `200` with a `status`/`valid`/`path` field even on logical failure (the folder dialog and the Instagram login, now `POST /api/v1/folders/pick` and `POST /api/v1/instagram/accounts`), while others used `{ error, hint?, detail? }` with a non-2xx status (the YouTube and Instagram metadata lookups, now `GET /api/v1/youtube/media` and `GET /api/v1/instagram/media`). ADR-024 later gave every route one error shape. Forcing a single throwing helper onto both would either break the no-throw call sites or silence the strict ones, so the module exposes both `postJSON` (no throw, matches the no-ok-check call sites' existing behavior exactly) and `postJSONStrict` (throws using the `error`/`hint`/`detail` convention documented at the time in `docs/guidelines/ERROR_HANDLING.md`) rather than picking one.
- SSE streams (`new EventSource(...)`) and the two request/response shapes that need the raw `Response` (the `multipart/form-data` transcription upload, and the two `transcribe/file` calls that read `resp.body.getReader()` for their own SSE-like line stream) are deliberately left untouched. ADR-006's reasoning that SSE consumption belongs colocated with the component that renders its progress still held (until ADR-025 and ADR-027), and forcing those into a JSON-in/JSON-out helper would lose the raw `Response`/`FormData` they need.

**Trade-offs:**
- Two POST helpers (`postJSON` vs. `postJSONStrict`) instead of one means a future call site has to pick the right one by checking how the target route actually reports failure. This is documented in the request module's own comments and `docs/guidelines/ERROR_HANDLING.md`.
- Covered by the request helpers' tests, now `frontend/tests/services/request.test.ts`; component-level behavior is unchanged (no new component tests were needed since no call site's semantics changed).

---

## ADR-017: Resume support for a single-video download interrupted by the app closing

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** The single-video download route (its logic is now in `backend/src/services/downloadService.ts` and `backend/src/services/downloads/`) records every in-flight single-video download's request parameters to a small JSON file when it starts, and removes that record the moment the request ends for any reason handled in-process: success, failure, or the user cancelling (SSE `res.on('close')`). The record is kept by the pending-download store (now `backend/src/stores/pendingDownloadStore.ts`) in `pending-downloads.json`, at the path `backend/src/lib/paths.ts` gives it (`pendingDownloadsFile`). A new route (now `GET /api/v1/downloads`) returns whatever records are still present. Those can only be downloads that were in flight when the whole app process was killed, since every other end-of-download path already cleaned up. The frontend (now `frontend/src/features/downloads/useResumableDownloads.ts` and a new `frontend/src/features/downloads/ResumeDownloadsBanner.tsx`) fetches this list on mount and offers to resume each one by re-issuing the exact original request.

**Alternatives considered:**
- Do nothing beyond yt-dlp's own default `--continue`-on-restart behavior (yt-dlp already resumes a partial `.part` file for free if re-invoked with the identical output path) and rely on the user manually re-pasting the same URL with the same settings
- A full persistent job queue (survives restarts, tracks progress, retries automatically)
- Detect resumability by scanning the downloads folder for `.part` files at startup instead of recording requests explicitly

**Reasoning:**
- yt-dlp's resume-by-default behavior only helps if the app re-issues the *exact* original request (same URL, quality, output path, naming options). The missing piece was remembering what that request was and surfacing it to the user, not teaching yt-dlp to resume.
- A full job queue is a much bigger feature (persistent progress, retry policy, multi-download scheduling) than "don't lose a single interrupted download when the app closes" calls for; `ROADMAP.md` explicitly scoped this as an investigation into surfacing yt-dlp's existing resume behavior, not a new download-orchestration system.
- Scanning for `.part` files can't reconstruct the original request parameters (quality, naming template, numbering) needed to resume correctly, and yt-dlp's partial-file naming isn't uniformly predictable across formats. Recording the actual request at start time is strictly more reliable.
- Removing the record on every in-process termination path (not just success) is what makes a stale record mean "the process itself died" rather than "a download is currently running" or "the user cancelled". Both of the latter would be misleading to resurrect as a resume prompt on next launch.

**Trade-offs:**
- Only single-video downloads are covered. Bulk/sequential downloads and Instagram downloads are not tracked by this registry; resuming a bulk batch mid-sequence is a materially bigger feature and is tracked as a separate `ROADMAP.md` item rather than folded in here.
- The record is best-effort: if the app is killed before the `Destination:` line is even parsed, the resume prompt falls back to showing the raw URL instead of a title. This is a cosmetic gap, not a functional one.
- Covered by the pending-download store's tests, now `backend/tests/stores/pendingDownloadStore.test.ts` (id stability/collision, title updates, removal, corrupt/missing state file), and by route cases for the two new routes, now in `backend/tests/routes/apiRoutes.test.ts`; the frontend banner has its own test (now `frontend/tests/features/downloads/ResumeDownloadsBanner.test.tsx`).

---

## ADR-018: `scripts/run-electron.mts` strips `ELECTRON_RUN_AS_NODE` before launching Electron in dev

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** `npm run dev`'s Electron step no longer invokes the `electron` binary directly (`electron --no-deprecation .`). It now runs `node scripts/run-electron.mts`, a small wrapper that resolves the real Electron binary path via `require('electron')`, deletes `ELECTRON_RUN_AS_NODE` from the child's environment, and spawns it with `stdio: 'inherit'`.

**Root cause found:** `npm run dev` crashed on startup with `TypeError: Cannot read properties of undefined (reading 'getVersion')` inside `electron-updater`'s `ElectronAppAdapter`, before any window opened. The trace showed the crash running under plain `Node.js v20.18.3`, not Electron's runtime: `ELECTRON_RUN_AS_NODE=1` was present in the shell's environment (confirmed via `env | grep -i electron`), which makes any Electron binary behave as a bare Node.js process instead of launching the Chromium/Electron runtime. In that mode, `electron.app` never exists, so `electron-updater`'s constructor (which reads `app.getVersion()` at construction time, the moment `require('electron-updater')` first touches its `autoUpdater` getter in the Electron main process, whose updater code is now in `electron/src/updater.ts`) throws immediately. This variable is commonly inherited from an Electron-based host process (VS Code, Cursor, and other Electron-based terminals set it for their own internal Node child processes), so it can appear in a dev shell without the user ever setting it themselves.

**Alternatives considered:**
- Tell the user to `unset ELECTRON_RUN_AS_NODE` (or the Windows equivalent) before running `npm run dev` every time
- Defer `require('electron-updater')` in the main process (the import is now in `electron/src/updater.ts`) until inside `app.whenReady()`, so the crash only happens if `setupAutoUpdater()` actually runs (it already early-returns in dev via `if (isDev) return;`)
- A `cross-env`-based `package.json` script to clear the variable inline

**Reasoning:**
- The variable is environmental, not something this project's own scripts set, and not something a contributor should have to know to unset by hand every session just to run `npm start`. The fix belongs in the repo, not in a setup instruction nobody will remember
- Deferred `require('electron-updater')` was considered but doesn't fully solve it: the top-level `const { autoUpdater } = require('electron-updater');` in the main process file triggers the crash the instant the file is loaded (accessing the `autoUpdater` export is itself a lazy getter that constructs the updater), before any `isDev` check ever runs. Moving the require would work but couples a workaround for an environment quirk into application code, rather than into the process-launch step where the actual problem (wrong environment) lives
- A dedicated Node wrapper needs no new dependency (`electron` is already a devDependency, and `require('electron')` from plain Node returns the resolved binary path, which is the documented way to spawn it programmatically) and fixes the problem at its actual source: the environment the Electron process inherits

**Trade-offs:**
- `dist:*`/`electron-builder` packaging scripts are unaffected. They invoke `electron-builder`, not `electron` directly, so this class of crash cannot happen during a build, only during `npm run dev`
- The packaged, installed app is also unaffected. End users launch the built `.exe`/`.dmg`/`.AppImage` directly, not through this wrapper

---

## ADR-019: App version and a manual "Check for Updates" button in Settings

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** The About card in Settings (now `frontend/src/features/settings/AboutCard.tsx`) now shows the running app version (`window.electronAPI.getAppVersion()`, backed by a new `get-app-version` IPC handler, now in `electron/src/ipcHandlers.ts`, that returns Electron's `app.getVersion()`) next to a "Check for Updates" button (`window.electronAPI.checkForUpdates()`, backed by a new `check-for-updates` IPC handler, now in `electron/src/updater.ts`, calling `autoUpdater.checkForUpdates()`). The main process's `setupAutoUpdater()` (now `setUpAutoUpdater()` in `electron/src/updater.ts`) now also forwards the `checking-for-update` and `update-not-available` autoUpdater events (previously only `update-available`, `download-progress`, `update-downloaded`, and `error` were forwarded), so the button can show "Checking…" and "You're on the latest version" instead of doing nothing when there's no update.

**Alternatives considered:**
- Only show the version, no manual check button (rely entirely on the existing 5-second-after-launch automatic check)
- Read the version from a Vite build-time constant instead of an IPC round-trip

**Reasoning:**
- The existing auto-update flow only checks once, five seconds after launch. A user who dismisses `UpdateDialog` (or whose app was open before a release went out) has no way to ask again without restarting the app. A manual check closes that gap.
- `electron-updater`'s `checkForUpdates()` requires `app-update.yml`, which `electron-builder` only generates for a packaged build (see ADR-018), so calling it in dev would throw. The `check-for-updates` handler special-cases `isDev` and returns `{ devMode: true }` instead, which the Settings UI surfaces as "Update checks only run in a packaged build" rather than a confusing error.
- `app.getVersion()` via IPC is the authoritative source (reads the actual running app's `package.json`, correct in both dev and packaged builds) versus a Vite `define` constant, which would need to be kept in sync separately and wouldn't reflect what's actually installed if a build were ever run against a stale checkout.
- The version/update UI is guarded by `window.electronAPI?.getAppVersion` and hides entirely when absent (e.g. the frontend loaded outside Electron), matching the existing guard pattern used everywhere else `window.electronAPI` is called.

**Trade-offs:**
- No dedicated test coverage was added for this. It's thin IPC plumbing (three one-line handlers, a getter, a button) with no meaningful logic to unit test beyond what the manual-verification checklist for `frontend/src/components/UpdateDialog.tsx` already covers; exercised via the manual checklist in `docs/workflows/TESTING.md` instead.

---

## ADR-020: Pause/Resume a single-video download via the same kill-and-continue mechanism as crash recovery

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** The progress modal (now `frontend/src/features/downloads/ProgressModal.tsx`) gets a "Pause" button during an active single-video download (next to Cancel) and a "Resume" button once paused. Pause calls a new route (now `POST /api/v1/downloads/:downloadId/pause`), which looks up the in-progress request in a module-level `activeDownloads` Map (keyed by the same `pendingId` used by the resume-after-restart registry from ADR-017; the map of running downloads is now in `backend/src/services/downloads/downloadRunner.ts`) and kills the yt-dlp process with `SIGTERM`, the identical mechanism `Cancel` already used. The only difference is bookkeeping: a paused request keeps its `pending-downloads.json` record and sends a new `paused` SSE event instead of `done`, so `Resume` can replay the exact original request and yt-dlp continues the same `.part` file. `Resume` on the frontend does not call any resume-registry endpoint. It directly replays the arguments last passed to `startSingleDownload` (`lastSingleDownloadArgsRef`), since the download is still this session's state, not a lookup from disk. Since the TypeScript rewrite, Resume calls `POST /api/v1/downloads/:downloadId/resume` instead (ADR-024).

**Alternatives considered:**
- True OS-level process suspension (Unix `SIGSTOP`/`SIGCONT`) so the download freezes mid-flight and resumes exactly where the TCP connection left off
- A native addon (e.g. `ntsuspend`) to get suspend/resume parity on Windows, which has no signal-based process suspension
- Route Resume-from-pause through the pending-download list (now `GET /api/v1/downloads`, the same list `ResumeDownloadsBanner` uses) instead of replaying local state

**Reasoning:**
- Real process suspension doesn't have a cross-platform story: POSIX has `SIGSTOP`/`SIGCONT` natively, but Windows has no equivalent without a native addon (`process.kill(pid, 'SIGSTOP')` is a no-op/unsupported on Windows per Node's own docs). Windows is this project's only fully-verified platform (see `docs/philosophy/CROSS_PLATFORM.md`), so a Windows-incompatible pause button would be a regression on the one platform that has to work.
- yt-dlp already writes its `.part` file incrementally as it downloads, so killing the process (same as Cancel) and letting yt-dlp's own default `--continue` behavior pick it back up on the next identical request is exactly as reliable as true suspension for this app's purposes, with none of the platform risk. This is the same insight ADR-017 already relied on for crash recovery: Pause is really just "cancel, but remember it as resumable" rather than a new resume mechanism.
- Reusing the pending-download store's existing record (now `backend/src/stores/pendingDownloadStore.ts`), rather than inventing a second, parallel "paused download" store, means a paused-then-force-closed download is *also* correctly offered back by `ResumeDownloadsBanner` on the next launch. Pause and crash-recovery resume compose for free instead of needing to be kept in sync.
- Replaying `lastSingleDownloadArgsRef` locally (rather than fetching the pending-download list, now `GET /api/v1/downloads`) avoids an unnecessary round-trip and race: the frontend already has the exact args it used to start the download, in the same session, in memory.
- A separate in-memory `activeDownloads` Map (rather than trying to derive "is this pending record currently running" from the JSON file alone) is necessary because the pause request (now `POST /api/v1/downloads/:downloadId/pause`) is a different HTTP request than the download SSE stream (now `POST /api/v1/downloads`). The two only share state through this module-level registry, cleared in every exit path (`finish()`, `proc.on('error')`, `res.on('close')`) so it can never point at a dead process.

**Trade-offs:**
- Only single-video downloads are covered, matching ADR-017's scope decision. Bulk/sequential downloads have no Pause button.
- Like ADR-017, this is best-effort: if the whole app is killed while paused, the record persists and shows up in `ResumeDownloadsBanner` on next launch (a feature, not a bug; see above). But there's no dedicated integration test exercising a real pause-mid-download-and-resume cycle, since that requires a real yt-dlp process and real network access, consistent with this project's existing policy of not automating real tool execution (see `docs/workflows/TESTING.md`). Covered by unit/route tests for the pieces that don't require a live download (the 404-when-nothing-active case) and by the progress modal's test suite (now `frontend/tests/features/downloads/ProgressModal.test.tsx`) for the UI states.

## ADR-021: Kill the whole yt-dlp process tree, not just the spawned PID, for Pause/Cancel

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** Add `backend/src/lib/processTree.ts`, exporting `killProcessTree(proc)`. On Windows it shells out to `taskkill /pid <pid> /t /f`; elsewhere it sends `SIGTERM` to the negative PID of a process spawned with `detached: true` (killing the whole POSIX process group). Every place that kills a yt-dlp-spawned process now calls this instead of `proc.kill('SIGTERM')`/`proc.kill()`: the download route's Pause (ADR-020) and Cancel, and the three yt-dlp spawns in the Instagram routes (single-video download cancel, bulk-download cancel, and the metadata-fetch timeout). Since the TypeScript rewrite, every yt-dlp process starts and stops through `backend/src/managers/ytdlp/ytdlpProcess.ts`, which uses the same helper.

**Root cause:** Reported as "Pause doesn't work while downloading, only once merging starts, and even then it's not where I clicked Pause." Reproduced directly against the backend (bypassing the UI) by opening the download SSE stream (now `POST /api/v1/downloads`) for a real video and firing the pause request (now `POST /api/v1/downloads/:downloadId/pause`) immediately after the first `progress` event. The pause request returned `200 {"success":true}` in under 100ms, but `progress` events kept arriving normally for the *entire* rest of the video and audio download. The file finished downloading and merging in full in the background, and only once yt-dlp's own process genuinely exited did the stream finally emit `paused` (at that point misreporting a fully-completed file as "paused"). `tasklist`/`Get-CimInstance Win32_Process` during a live download showed **two** `yt-dlp.exe` processes, a small one (the one Node's `spawn()` PID pointed at) that was the parent of a second, larger one doing the real work. This is standard PyInstaller "onefile" behavior on Windows: the process yt-dlp.exe presents is a launcher/bootloader that unpacks itself and execs a second process to do the actual work, then waits on it and relays its stdio. `proc.kill('SIGTERM')` (via Node -> libuv -> `TerminateProcess`) only ever reached the launcher. The real worker was orphaned and kept running, and kept its handle to the shared stdout pipe open, which is also why Node's `'close'` event (which waits for stdio to fully drain, not just for the process to exit) didn't fire until that orphan finished on its own.

**Alternatives considered:**
- Listen for `'exit'` instead of `'close'` on the parent process, so `finish()` fires as soon as the launcher dies. Rejected because it doesn't address the actual defect (the real download keeps running and keeps writing/finishing the file in the background regardless of which Node event ends the SSE stream); it would just make the frontend's "Paused" state appear sooner while the download silently continues anyway.
- A native module for real PID-tree enumeration/termination. Unnecessary: `taskkill /t` already walks the live process tree and ships with every Windows install.

**Reasoning:**
- `taskkill /pid <pid> /t /f` is the standard, dependency-free way to kill an entire Windows process tree; it's what Task Manager's "End process tree" and most cross-language process-tree-kill libraries shell out to under the hood.
- POSIX process groups (`detached: true` at spawn + `process.kill(-pid, 'SIGTERM')`) are the equivalent mechanism on macOS/Linux, and yt-dlp's macOS/Linux releases are PyInstaller onefile builds too, so the same launcher/worker split is expected there even though it's unverified on real hardware (tracked in `docs/philosophy/CROSS_PLATFORM.md`).
- This bug was never specific to Pause. `Cancel` used the exact same `proc.kill('SIGTERM')` call and had the identical defect: clicking Cancel closed the SSE stream and hid the modal, but the download kept running to completion in the background, consuming bandwidth and disk the user believed they'd stopped. Every yt-dlp-spawning kill site got the same fix rather than patching only the reported one.

**Trade-offs:**
- `taskkill` is spawned as a fire-and-forget subprocess rather than awaited; this is intentional (killing is best-effort and the caller doesn't block on it), but it means a `killProcessTree()` call gives no direct signal of success or failure back to the caller.
- Verified by direct reproduction against the real backend (see above) rather than a unit test, since it depends on real yt-dlp process behavior, consistent with this project's existing policy of not automating real tool execution (`docs/workflows/TESTING.md`).

## ADR-022: Live yt-dlp update check against GitHub's latest release

**Date:** 2026-07-27
**Status:** Accepted

**Decision:** Add `checkForYtdlpUpdate()` and `updateYtdlp()` to the yt-dlp manager (now `fetchLatestVersion()` and `update()` in `backend/src/managers/ytdlp/ytdlpManager.ts`, with the GitHub call in `backend/src/managers/ytdlp/ytdlpRelease.ts`). The former calls GitHub's `GET /repos/yt-dlp/yt-dlp/releases/latest` API and compares its `tag_name` against the installed binary's `--version` output using a new pure helper, `isNewerYtdlpVersion()` (now `isNewerVersion()` in `backend/src/lib/versions.ts`); the latter re-downloads the platform-appropriate asset for whatever tag that check found, overwriting the current binary in place. Two new routes expose this, now `GET /api/v1/tools/ytdlp/releases/latest` (plain JSON) and `POST /api/v1/tools/ytdlp/update` (an SSE download stream, same shape as the install route, now `POST /api/v1/tools/:toolId/install`). The Settings page's About card gets a yt-dlp row (now `frontend/src/features/settings/YtdlpVersionRow.tsx`): a "Check for Updates" button (manual, like the app's own updater above it) that becomes an "Update to `<version>`" button when one is found, with a progress bar during the download.

**Root cause / gap being closed:** `checkYtdlpStatus()` already had a `needsUpdate` flag, but it only compares the installed binary against `YTDLP_VERSION`, the version constant pinned in this codebase, bumped manually as "a separate, routine maintenance task" (`ROADMAP.md`). That check can only ever tell a user their binary doesn't match what *this copy of KineTube* was tested against; it has no way to know yt-dlp has published something newer upstream if `YTDLP_VERSION` itself is stale, which is exactly the common case for a tool like yt-dlp that ships frequent releases to keep up with YouTube's own changes. Confirmed live during implementation: at the time this shipped, the pinned `YTDLP_VERSION` was `2026.03.17` while yt-dlp's actual latest GitHub release was `2026.08.19`, a real, several-month-old gap the old check had no way to surface.

**A bug this surfaced:** `checkYtdlpStatus()`'s original `needsUpdate` was a plain inequality (`normCurrent !== normRequired`), not a "which is newer" comparison. Verified end-to-end against the real backend: after using the new "Update yt-dlp" button to install `2026.08.19`, the *existing* pinned-version check immediately started reporting `needsUpdate: true` again, now pointing an "outdated" warning at a binary that was actually newer than what KineTube expected, not older. Fixed by rewriting that comparison to use the same `isNewerYtdlpVersion()` helper (`isNewerYtdlpVersion(YTDLP_VERSION, currentVersion)`, meaning "is the pinned version newer than what's installed"), so drift in the "ahead of pinned" direction is no longer misreported as "behind." That comparison is now in `backend/src/services/tools/toolStatus.ts`.

**Alternatives considered:**
- Rolling the live GitHub check into `checkYtdlpStatus()` itself, so every caller gets live data. Rejected: `checkYtdlpStatus()` is called from several hot, synchronous-feeling paths (the yt-dlp status and metadata routes, now `GET /api/v1/tools/ytdlp` and `GET /api/v1/youtube/media`, and `setupToolsWithProgress`), and making all of them wait on a GitHub round-trip (or silently swallow one more failure mode) is a worse trade than one dedicated, opt-in check the user triggers from Settings. That is the same reasoning the app's own "Check for Updates" button already uses for `electron-updater`.
- Auto-downloading and installing the update without a confirmation step. Rejected as inconsistent with this app's "no silent background changes to installed tools" posture, and with how the app's own auto-updater already requires an explicit click (`autoDownload = false`, now in `electron/src/updater.ts`).

**Reasoning:**
- GitHub's `releases/latest` API needs no auth for a public repo at this call volume (one manual click, not a poll), and returns `tag_name` directly, with no HTML scraping or extra dependency.
- yt-dlp's calendar-style tags (`2026.03.17`, occasionally `2026.03.17.1`) sort incorrectly under plain string comparison once any part reaches two digits differently (`"2026.3.9" > "2026.3.10"` as strings). `isNewerYtdlpVersion()` splits on `.`/`-` and compares each part numerically instead, and is unit tested directly (now as `isNewerVersion()` in `backend/tests/lib/versions.test.ts`) rather than only indirectly through a route.
- `updateYtdlp()` re-fetches the latest tag itself rather than trusting a tag the caller passed in from an earlier `checkForYtdlpUpdate()` call, so a click on "Update" several minutes after the check still gets whatever is actually latest at click time, not a stale tag.
- The update-check network call resolves `{ checked: false, error }` on any failure rather than rejecting or returning a 5xx, matching this app's error-handling convention that a route feeding a background/optional check must degrade gracefully (`docs/guidelines/ERROR_HANDLING.md`).

**Trade-offs:**
- Scoped to yt-dlp only, matching what was actually requested. ffmpeg's three download sources (gyan.dev, evermeet.cx, johnvansickle.com) aren't GitHub releases and have no equivalent "latest tag" API, so the same mechanism doesn't directly extend to it.
- No automated route test for the check and update routes themselves (now `GET /api/v1/tools/ytdlp/releases/latest` and `POST /api/v1/tools/ytdlp/update`), since both require real network access (GitHub, then a real binary download), consistent with this project's existing policy of not automating real tool execution (`docs/workflows/TESTING.md`). Verified manually end-to-end during implementation (check found a real pending update, update downloaded it, binary's own `--version` reflected the new release afterward).
- `YTDLP_VERSION` (the pinned constant used elsewhere: the initial-install URL, and now also the "outdated" comparison target) was deliberately left unbumped, consistent with `ROADMAP.md`'s existing note that this is routine maintenance handled separately from feature work. This ADR is what gives a user a way to get current without waiting on that.

---

## ADR-023: TypeScript everywhere, replacing ADR-007

**Date:** 2026-10-17
**Status:** Accepted. Replaces ADR-007.

**Decision:** The backend, frontend, Electron main process, scripts and shared API types are strict TypeScript (TypeScript 6.0). Settings: `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` in the backend and frontend. No `any`, `enum`, `@ts-ignore`, or non-null assertions where a check works instead.

**Why ADR-007 no longer holds:** ADR-007 kept JavaScript to avoid a build step and because the code was small. By 1.6 the backend had a route file of 1,000 lines that built yt-dlp arguments from untrusted query strings, and the frontend and backend agreed on response shapes only by convention. Several of the security bugs fixed in ADR-026 came from values nobody had typed or validated.

**Alternatives considered:**
- JSDoc types on JavaScript: it checks less, and the owner's style rules out JSDoc blocks.
- TypeScript 7 (the native compiler): typescript-eslint does not support it yet, so 6.0 is the newest version the frontend lint can use.

**Trade-offs:**
- The packaged app needs a build step (ADR-029).
- Development needs Node 22.18 or newer, which runs `.ts` files directly.

---

## ADR-024: A versioned REST API under /api/v1

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** Every route moves to `/api/v1` and is named after a resource: `tools`, `downloads`, `download-batches`, `whisper-models`, `transcriptions`, `instagram/accounts`, `youtube/media`, `instagram/media`, `folders` and `images`. Reads use GET. Every action uses POST (`/tools/:toolId/install`, `/downloads/:downloadId/pause`, `/downloads/:downloadId/resume`). Deletes use DELETE and answer 204. A single item comes back as `{ data }`, a list as `{ data, total }`, and every error as `{ success: false, code, message, requestId }`. `/health` stays at the root because Electron and the dev script wait on it.

**Alternatives considered:**
- Keep the 1.x routes and only add types. The old routes mixed verbs into paths (`/ytdlp-update-check`, `/validate-path`), started downloads with GET, and used a different error shape in each file.
- Pagination on every list. No list here can grow large: tools, models, accounts and pending downloads are a handful of items, and a channel or profile listing is one yt-dlp or instaloader call that the page shows whole.

**Reasoning:** a consumer can guess the route for a resource from the others. Status codes say what happened: 201 when a login saved an account, 202 when Instagram wants a code first, 409 when the same download is already running. `/v1` leaves room to change the contract later without breaking an older build.

**Trade-offs:** every 1.x route changed in one release. The frontend and backend ship together in one installer, so no outside consumer breaks. `docs/architecture/backend/ROUTES.md` keeps an old-to-new table.

---

## ADR-025: Fetch-based streams replace EventSource

**Date:** 2026-10-17
**Status:** Accepted. ADR-005 (server-sent events for long work) still holds.

**Decision:** The frontend reads server-sent events with `fetch` and a stream reader (`frontend/src/services/eventStream.ts`) instead of `EventSource`. Every stream ends with a `done` event that carries either the result or the same `code` and `message` as a JSON error. A paused download is the one exception: it ends with `paused`, and the reader is told so. Closing the stream aborts the request, and the backend cancels downloads and batches when that happens.

**Reasoning:**
- `EventSource` can only send GET, so 1.x started downloads with GET and long query strings. With `fetch`, actions are POST requests with JSON bodies, which also makes the browser send a preflight for cross-site requests (ADR-026).
- `EventSource` reconnects on its own after a stream ends. 1.x worked around that with a `retry: 3600000` line and a "closed" flag in every consumer.
- An error found before the stream opens (a bad link, a missing tool, a 409) arrives as a normal JSON error, so the page shows the backend's message instead of "connection lost".

**Trade-offs:** about 120 lines of client code that the browser used to provide, covered by `frontend/tests/services/eventStream.test.ts`.

---

## ADR-026: Loopback listener and a Host and Origin guard

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** The backend listens on `127.0.0.1` only. `backend/src/middleware/originGuard.ts` answers 403 to any request whose Host is not `localhost:<port>` or `127.0.0.1:<port>`, and to any request with an Origin other than the app itself or the Vite dev server. The `cors` package is removed, because the app never needs cross-origin access.

**Problems this fixes (all found during the rewrite):**
- 1.x listened on every network interface, so other machines on the network could call the API.
- Its CORS rule allowed every origin whenever `ELECTRON_APP` was set, which is always true in the installed app. Any web page open in the person's browser could start downloads, read the account list, or start a pip install.
- `/api/instagram/bulk-download` passed each item's `url` to yt-dlp without parsing it, so a value such as `--exec=<command>` ran a command. Every link is now parsed by the platform URL parsers and placed after `--` in yt-dlp's arguments.
- `DELETE /api/instagram/accounts/:username` built a file path from the username, so `../` reached files outside the sessions folder. Usernames are now validated.
- The image proxy matched allowed hosts with `endsWith`, so `evilinstagram.com` passed. Hosts now match exactly or as a real subdomain, over https only, and every redirect is checked again.

**Reasoning:** the Host check also stops DNS rebinding, where a web page points its own domain at 127.0.0.1 to get around the browser's same-origin rule.

**Trade-offs:** the Electron window keeps loading `http://localhost:3001` rather than `127.0.0.1`, because localStorage is kept per origin and saved settings would otherwise be lost.

---

## ADR-027: One API client module, replacing ADR-006 and ADR-016

**Date:** 2026-10-17
**Status:** Accepted. Replaces ADR-006 and ADR-016.

**Decision:** Every request, streaming or not, goes through `frontend/src/services/api.ts`, typed by the shared types. Components never call `fetch`.

**Reasoning:** ADR-006 kept stream handling inside each component because each `EventSource` needed its own listeners and close logic. With the stream reader from ADR-025, a stream is one function call with a typed handler, so nothing is left to keep beside the component. Pure reducers (`singleDownloadState.ts`, `bulkDownloadState.ts`, `transcribeQueueState.ts`) turn events into state and are unit tested without rendering.

---

## ADR-028: Shared API types through TypeScript project references

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** `shared/types/` holds the request, response and stream-event types and nothing else. It is a composite TypeScript project that emits declarations only. The backend, frontend and Electron projects reference it and import it with `import type`, so none of it exists at runtime.

**Alternatives considered:**
- npm workspaces with a shared package. Workspaces move dependencies into the root `node_modules`, but electron-builder copies `backend/` with its own `node_modules`, so the packaged backend would lose its dependencies.
- Importing the shared files directly. The backend build would then reject them for sitting outside its `rootDir`, or nest its output under `dist/backend/src/`.

---

## ADR-029: Compiled JavaScript for the packaged app

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** In development the backend runs its `.ts` files directly on Node 22.18 or newer. For the installer, `tsc` compiles the backend to `backend/dist/` and the Electron main process to CommonJS in `electron/dist/`. The helper scripts are `.mts` files that Node 22 runs directly.

**Reasoning:** Electron 33 runs the backend on its own Node 20, which cannot strip TypeScript types. Upgrading Electron only to get type stripping would change the runtime of a shipping app for a build convenience.

**Trade-offs:** `npm run build:backend` compiles and then prunes dev dependencies, so the release workflow installs the backend with dev dependencies first, and it now runs on Node 22.

---

## ADR-030: Instagram sessions are not passed to yt-dlp

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** The backend no longer passes instaloader's session file to yt-dlp as `--cookies`. Instagram post lookups and downloads run logged out. Profiles still use the saved session, through instaloader.

**Root cause:** instaloader saves a session as a Python pickle, not as the Netscape cookie file yt-dlp expects. yt-dlp failed to read it (`'utf-8' codec can't decode byte 0x80`). In 1.x, every Instagram lookup or download with an account selected failed. Confirmed against the real backend during the rewrite.

**Follow-up:** a helper that exports the session's cookies to a Netscape file would let yt-dlp download private posts again (`ROADMAP.md`).

---

## ADR-031: One download runner for YouTube and Instagram

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** `POST /api/v1/downloads` takes a YouTube video or Shorts link, or an Instagram post, reel or story link, and both go through the same runner in `backend/src/services/downloads/`. Instagram downloads are now recorded as pending, so they can be paused, resumed, and offered again after the app closes. `POST /api/v1/download-batches` takes a list from either site and spaces out the Instagram items. The single download route refuses channel and profile links, so one request can never download a whole page by accident.

**Reasoning:** 1.x had two download routes that shared most of their code and had drifted apart: different file-name cleaning, different format selectors, and no pause for Instagram.

**Trade-offs:** an Instagram download now uses the YouTube format selectors. They also fit Instagram, which serves one combined stream per height.

---

## ADR-032: Layout from the ElevenLabs web app, identity from the kinetube brand kit

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** The frontend's structure (shell proportions, spacing, control sizes, hairlines, underline tabs, choice cards, list rows, the settings column beside a working surface) follows the ElevenLabs web app, measured in DevTools and recorded in `docs/design-reference.md`. Every colour, font, logo and accent comes from `frontend/public/kinetube-brand-kit/`. All of it goes through tokens in `frontend/src/styles/tokens.css`; components never name a palette colour.

**Alternatives considered:**
- Restyling the 1.x screens in place. Their colours were hard-coded light-theme fills (`bg-blue-50`, `text-green-700`), which is why the dark theme broke, so a token system had to come first either way.
- Copying the reference's look. Its white primary button, neutral greys and logo would make kinetube look like someone else's product.

**Where structure and skin disagreed:** buttons and chips are pills, because the brand kit makes round controls part of the identity, but they keep the reference's 32, 36 and 40 px heights. Inputs and rows use the reference's 10 and 8 px radii. Light-theme values come from the kit, because the reference was only measured in dark.

**Trade-offs:** the kit has no state colours or lifted surfaces, so those are derived and recorded in `docs/design-reference.md` with their contrast ratios. Batch download moved from a mode of the YouTube page to its own page.

---

## ADR-033: Self-hosted brand fonts

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** Unbounded and DM Sans load from `@fontsource-variable/unbounded` and `@fontsource-variable/dm-sans`, bundled with the frontend. `@fontsource-variable/geist` is removed.

**Reasoning:** the brand kit links Google Fonts, but a desktop app should look the same offline and should make no request the person did not ask for. Both families are under the SIL Open Font License. The variable files are small: the Latin subsets are 37 KB for DM Sans and 51 KB for Unbounded.

---

## ADR-034: Playlists, channel tabs and a status on every listed video

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** `GET /api/v1/youtube/media` answers playlist links (`/playlist?list=`) with a `YouTubePlaylist`, and channel links accept the videos, shorts, streams and playlists tabs. Every listed video is a `VideoEntry` with a `status` of available, upcoming, live or unavailable. A watch link with `list=` stays a video, but its `playlistUrl` lets the page offer to load the whole list. The single download route still refuses lists; the page sends the picked videos as a batch.

**Reasoning:** 1.x refused playlist links and only listed the Videos and Shorts tabs. The Live tab lists upcoming and running streams, which yt-dlp cannot download as finished files, and playlists list private and deleted videos; the status lets the page show them without letting them be picked.

**Trade-offs:** YouTube's playlist count can include videos it hides, so the page says how many are hidden. Playlist ids shorter than 10 characters (Watch later, Liked videos) are refused, because they need a login.

---

## ADR-035: Toasts for results, hold to confirm for destructive actions

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** Sonner's `Toaster` is mounted once in `frontend/src/main.tsx`. Toasts confirm results that leave the screen unchanged (settings saved, a transcript copied, a login saved) and report errors that have no field to sit under (an empty clipboard). Dismissing an unfinished download hides it at once and deletes the backend's record only when the toast closes without Undo. Removing an Instagram account and clearing the transcription queue need a press and hold, never a single click.

**Reasoning:** `docs/WRITING_STANDARDS.md` asked for Sonner toasts since 1.x, but nothing showed one. A hold is a stronger guard than a confirmation click for actions that delete a saved login or unsaved transcripts, and it works from the keyboard by holding Space or Enter.

---

## ADR-036: Work is tracked in GitHub issues

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** Every piece of work starts as an issue in `spacesdrive/kinetube`. Commits name it (`Refs #n` while it is in progress, `Closes #n` in the commit that finishes it), and the issue is closed with a comment naming the commit as soon as the work lands on the working branch, because GitHub only closes issues automatically from the default branch.

**Reasoning:** the owner asked for it, and it gives each change a place for its reason and its follow-ups.

---

## ADR-037: Version 2.0.0

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** The root, backend and frontend packages are all 2.0.0. The root `package.json` names the installer and is the version Electron reports; the frontend reads the same file at build time (`__APP_VERSION__` in `vite.config.ts`), so Settings shows the version in a plain browser too.

**Reasoning:** the TypeScript rewrite, the `/api/v1` API and the redesign are breaking changes. The backend and frontend packages had drifted to 1.0.0 and 0.0.0, and the last local installer was still named 1.0.0.

---

## ADR-038: README demos filmed with Flute

**Date:** 2026-10-17
**Status:** Accepted

**Decision:** The README shows animated GIFs of the real interface instead of still screenshots. They are filmed with Flute (`@webprodigies/flute` 0.1.2, a frontend dev dependency pinned to an exact version). Scenes live in `frontend/src/flute/scenes/` and render real components with fixture data from `frontend/src/flute/demo/`. `main.tsx` loads Flute's adapter only in development and only with `?flute-preview=1`, so the production bundle is unchanged. `npm run demos` exports each scene to MP4 with Flute and turns it into a GIF in `docs/media/` with FFmpeg (`docs/workflows/DEMOS.md`).

Flute's automatic Vite setup refused this project's `vite.config.ts` (it has `define`, a proxy and a test block), so the project uses Flute's portable React adapter: `npx flute init` and `npx flute sync` generate `ProjectPreview.jsx` and `catalog.js`, and `ProjectPreview.d.ts` types them. Flute's CLI only accepts that generated file as the host entry.

**Reasoning:** the owner asked for the README to use Flute and many GIFs. Filming the live components keeps the demos true to the app: a change to a page shows up in its GIF the next time `npm run demos` runs, with no redrawn mockups to maintain. The package has no install scripts and never reaches a production build. The GIFs are kept near 5 MB each (800 px, 12 frames a second, 96 colours), because a moving camera changes every pixel of every frame and GIF compression gains little from that.

---

## ADR-039: README animations as animated WebP

**Date:** 2026-10-18
**Status:** Accepted

**Decision:** `npm run demos` (`scripts/make-demos.mts`) turns each Flute MP4 into an animated WebP in `docs/media/` instead of a GIF: 12 frames a second, 800 pixels wide, lossy at quality 75, looping forever. The README points at the `.webp` files, and the GIFs are removed. This replaces the GIF part of ADR-038; the scenes and Flute stay as they are.

**Reasoning:** the six GIFs came to about 23 MB, and GitHub fetches every image when it renders the README, so the page loaded slowly (issue #13). The same frames as WebP total about 4.7 MB, keep full colour instead of a 96-colour palette, and look as sharp. GitHub serves a repository's `.webp` files as `image/webp`, and every current browser plays animated WebP. A `<video>` tag was ruled out because GitHub only plays videos uploaded as issue or comment attachments, not files in the repository.

---

## ADR-040: A website in site/ on Cloudflare Pages

**Date:** 2026-10-18
**Status:** Accepted

**Decision:** The website lives in `site/`, a separate Vite, React 19, Tailwind CSS 4 and TypeScript project with its own `package.json`, served by the Cloudflare Pages project `kinetube-site` at https://kinetube.ujjwal.fyi. It was built from the ProfileBox prompt "Activepieces.com Landing Page, Sign-in Page and Docs Style (v2)": the layout, scroll story, cursor-driven product pictures, navbar and docs frame follow activepieces.com, and the colours, fonts, logo and voice follow the kinetube brand kit. The prompt's sign-in part is left out because kinetube has no accounts. The docs are MDX pages ported from the existing guides, with a search index built at build time. `.github/workflows/deploy-site.yml` checks every change and deploys `main`.

New packages, all in `site/` only: `motion` (the scroll story and product pictures, loaded after the hero), `react-router` 7 (routing; version 8 needs Node 22.22, above the repository's 22.18), `@mdx-js/rollup`, `@mdx-js/react`, `remark-gfm`, `shiki` and `@shikijs/rehype` (the docs pages and code highlighting), `minisearch` (docs search) and `wrangler` (deploys). The site's icons are Lucide, as the brand kit and the app use, instead of the prompt's default Solar set.

**Reasoning:** the owner asked for a landing page at kinetube.ujjwal.fyi with a CI/CD workflow. A separate project keeps the site's packages out of the app, the installers and the release workflow, which runs on three operating systems. The site reuses the app's colour tokens and fonts so the two look like one product, and its pictures use the app's real labels and the same NASA sample data as the README recordings. Pages was created as a classic Pages project (`wrangler pages project create --force`), matching the owner's other sites, because wrangler 4.151 otherwise moves new Pages projects to Workers.

---

## ADR-041: Transcript formats rendered by the backend

**Date:** 2026-10-18
**Status:** Accepted

**Decision:** whisper.cpp runs with its timestamps on (no more `--no-timestamps`). The backend parses each `[start --> end] text` line into a segment and renders every format from those segments in `managers/whisper/whisperFormats.ts`: TXT, SRT, VTT, LRC, CSV, TSV and JSON. `POST /api/v1/transcriptions` takes `formats`, the files to write beside the input (plain text when left out). Its `done` event carries the full text of every format (`transcripts`) and the paths written (`outputPaths`), which replaces `outputPath`. An upload writes no files. The frontend only names and saves the formats; it has no formatting code.

**Reasoning:** the owner asked for transcripts in every common format, not only one paragraph. The formats are rendered in one place because both sides need them: the backend writes files beside a downloaded video, and the app saves any format from the queue, including dropped files that have no folder to write to. Sending every format in `done` costs a few hundred kilobytes for an hour of speech over a local connection, and saves a second run or a second endpoint. Our own renderer was chosen over whisper.cpp's `-osrt`, `-ovtt` and similar flags because those write files only, and the app also needs the text of each format. The JSON keeps OpenAI Whisper's seconds and the CSV and TSV keep milliseconds, so files work with tools that read either. `outputPath` was dropped rather than kept beside `outputPaths`: the API listens on 127.0.0.1 behind the origin guard, so the bundled frontend is its only client.

---

## ADR-042: Installer names without the version, for direct download links

**Date:** 2026-10-18
**Status:** Accepted

**Decision:** The installers are named `KineTube-Setup.exe`, `KineTube-x64.dmg`, `KineTube-arm64.dmg` and `KineTube-x86_64.AppImage`, set by `artifactName` in `build.nsis`, `build.dmg` and `build.appImage`. The website, the README and the install docs link to `https://github.com/spacesdrive/kinetube/releases/latest/download/<name>`, which GitHub answers with the newest release's file. The site's hero shows the version from the root `package.json`, and `release.yml` ends with a job that redeploys the site once every installer is uploaded. This replaces the `${version}` part of ADR-014's name; the rule that the name has no spaces stays.

**Reasoning:** the owner asked for a Download button that gives the installer directly and stays right after every release without touching the site. A stable name makes GitHub's `latest/download` address do that with no server, no API call from the visitor's browser and no rate limit. The alternatives were worse: asking the GitHub API from the page adds a request per visit and a 60 an hour limit per visitor; rewriting the links at build time means the site breaks if a deploy is missed; and uploading a second, unversioned copy of each installer doubles every upload. electron-updater reads the file name from `latest.yml` and downloads from the new version's release, so a name that repeats across releases does not confuse it. The one cost is that a downloaded file no longer shows its version in its name; the installer's properties and the app's About section still do. The first update from 2.0.0 downloads in full, because differential updates look for the old blockmap under the old name, and the release workflow does not upload blockmaps anyway.
