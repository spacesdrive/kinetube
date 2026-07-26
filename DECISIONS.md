# Architectural Decision Log

Records every significant architectural decision, the alternatives considered, and the reasoning. Append new entries - never modify or delete existing ones.

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
- The backend can be developed and smoke-tested independently of Electron (`node server.js`, `curl`) - useful given the app has no automated integration test suite yet
- Keeps the main process focused on window/OS-level concerns

**Trade-offs:**
- Two runtimes to reason about (main process vs. backend child process) instead of one
- Requires the `waitForServer()` readiness dance in `electron/main.js` before navigating the window

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
- Matches Electron's recommended pattern for background Node.js work in a packaged app (per Electron's own documentation - verified via Context7 when this was implemented)

**Trade-offs:**
- Only available in Electron >= 22; not a concern here since the app targets Electron 33
- `stdio: 'pipe'` output must be manually forwarded to the app's log file (`writeLog()` in `main.js`) rather than inheriting the parent's console automatically

---

## ADR-003: Managed external tools, downloaded at runtime, excluded from the installer

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** yt-dlp, FFmpeg, whisper.cpp, and instaloader are not bundled into the electron-builder output. `extraResources.filter` in `package.json` explicitly excludes their binaries, and each is downloaded into the writable data root on first use via a manager in `backend/utils/`.

**Alternatives considered:**
- Bundle all four tools into the installer for every platform
- Bundle only yt-dlp/ffmpeg (small, frequently updated) and require the user to install whisper.cpp/instaloader manually

**Reasoning:**
- yt-dlp needs frequent updates to keep working against YouTube's changes; a bundled binary would go stale between app releases
- Combined size of all four tools plus whisper models would make the installer very large for users who may only want a subset of features
- Runtime download means yt-dlp/ffmpeg/whisper.cpp/instaloader can each update on their own cadence

**Trade-offs:**
- The app is non-functional on first launch until setup completes and the user has a working internet connection
- As implemented, every manager's download logic is Windows-only - see `docs/philosophy/CROSS_PLATFORM.md` for the resulting gap on macOS/Linux
- No automated test coverage for the download/extract/spawn path itself (network + subprocess dependent) - see `docs/workflows/TESTING.md`

---

## ADR-004: `paths.js` as the single writable-data-root resolver

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** All backend code that needs a writable path (downloaded binaries, whisper models, Instagram sessions) imports `DOWNLOADS_DIR`/`MODELS_DIR`/`SESSIONS_DIR` from `backend/utils/paths.js`, which resolves to `app.getPath('userData')` when `ELECTRON_USER_DATA` is set (packaged) and to `backend/` itself otherwise (dev).

**Alternatives considered:**
- Each manager resolving its own path relative to `__dirname`
- A single global constant duplicated across files

**Reasoning:**
- A packaged Windows app installed under `Program Files` cannot write into its own installation directory without elevated permissions; every manager independently discovering this would be error-prone
- Centralizing the resolution means the dev/packaged distinction is handled in exactly one place

**Trade-offs:**
- Anything that bypasses `paths.js` and hardcodes a path relative to its own file will silently work in dev and break in a packaged build - this is the most common regression class in this codebase's history and is called out explicitly in `docs/guidelines/JAVASCRIPT.md` and `CLAUDE.md`'s security invariants

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
- Each streaming route hand-rolls its own SSE writer (`res.write(\`event: ...\ndata: ...\n\n\`)`) rather than using a shared middleware - acceptable given there are only a handful of these routes; revisit if the count grows significantly

---

## ADR-006: No central `api.js` layer in the frontend

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** Frontend components call `fetch()` directly against `/api/...` paths rather than going through a shared API client module.

**Alternatives considered:**
- A single `api.js` exporting one function per backend endpoint (common pattern in larger SPAs)

**Reasoning:**
- The app has no auth headers, no shared base URL logic beyond same-origin/dev-proxy (handled by Vite's proxy config), and a small enough number of endpoints that a central module would mostly be indirection without meaningfully reducing duplication
- SSE consumption in particular benefits from being colocated with the component that renders its progress, rather than abstracted behind a generic client

**Trade-offs:**
- If the number of distinct backend calls grows substantially, or auth/base-URL logic is ever introduced, revisit this and introduce a shared `api.js` - track that reconsideration in `ROADMAP.md` if it becomes relevant

---

## ADR-007: No TypeScript

**Date:** 2025 (initial)
**Status:** Accepted

**Decision:** The entire project - Electron main process, Express backend, React frontend - is plain JavaScript/JSX.

**Alternatives considered:**
- TypeScript throughout
- TypeScript for the backend only

**Reasoning:**
- Keeps the backend's CommonJS setup simple (no build step required to run `node server.js`)
- The project is small enough that `docs/guidelines/NAMING.md` and consistent patterns provide adequate clarity without static types

**Trade-offs:**
- No compile-time type safety across the Electron IPC boundary or the SSE event payloads - mismatches surface at runtime, not build time

---

## ADR-008: `node:test` and Vitest for automated tests, not Jest/Mocha

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Backend unit tests use Node's built-in `node:test` + `node:assert/strict` (zero new dependencies). Frontend unit tests use Vitest (Vite-native, minimal config on top of the existing `vite.config.js`).

**Alternatives considered:**
- Jest for both layers (most common choice, but adds a heavier dependency and a separate transform pipeline that duplicates what Vite already does for the frontend)
- Mocha + Chai for the backend

**Reasoning:**
- The backend is plain CommonJS targeting a Node runtime that already ships a capable built-in test runner (Node 18+; this project runs on Node 22 in the reference dev environment and Electron 33's bundled Node) - adding Jest would be a new dependency for something the runtime already provides
- Vitest reuses the frontend's existing Vite config and ESM setup with minimal added configuration, and is the natural pairing for a Vite + React 19 frontend

**Trade-offs:**
- `node:test` has a smaller assertion/matcher ecosystem than Jest - acceptable given the initial test surface (pure functions: URL parsers, text cleanup, path resolution) needs only `node:assert/strict`
- Two different test runners across the two layers, rather than one - acceptable given the backend and frontend already use two different module systems (CommonJS vs. ESM) and have no shared test infrastructure need

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
- Documentation now requires active maintenance discipline (see `CLAUDE.md`'s Documentation Maintenance Policy table) - stale docs referenced by the map would be worse than no map at all, since they'd be trusted and wrong

---

## ADR-010: Removed the dead Windows-only `instaloader.exe` download path

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Deleted `instaloaderManager.js`'s `ensureInstaloader()`, `getInstaloaderPath()`, `isInstaloaderReady()`, `INSTALOADER_EXE`, `INSTALOADER_VERSION`, and `INSTALOADER_ZIP_URL`, and removed the `GET /api/instagram/setup` and `GET /api/instagram/setup/check` routes that called them.

**Alternatives considered:**
- Make the standalone-exe path cross-platform (find/build equivalent macOS/Linux binaries)
- Leave it in place as a legacy/unused fallback

**Reasoning:**
- Grepping the entire frontend confirmed no component ever calls `/api/instagram/setup` or `/api/instagram/setup/check` - `InstagramLoginModal.jsx` only calls `/api/instagram/setup/python/check` and `/api/instagram/setup/instaloader` (the `pip install instaloader` flow)
- `App.jsx` already had a comment confirming this: "instaloader.exe is no longer required — Python + instaloader library handles everything"
- The real Instagram scraping flow (`detectPython()`, `loginWithPython()`, `instaloader_login.py`/`instaloader_profile.py`) has been Python-module-based, and therefore already cross-platform, for some time - the dead code was actively misleading anyone auditing platform support, since it made instaloader look like a fourth Windows-only gap when it was not
- `docs/guidelines/JAVASCRIPT.md`'s "No Unused Code" rule and `getInstaloaderPath` being imported-but-never-called made this an unambiguous deletion, not a judgment call

**Trade-offs:**
- None identified - this is pure removal of unreachable code plus the two routes that only ever called it

---

## ADR-011: yt-dlp and ffmpeg cross-platform sources

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** `ytdlpManager.js` now resolves a platform-specific download source for both tools:
- yt-dlp: the same pinned GitHub release's platform-specific standalone binary (`yt-dlp.exe` / `yt-dlp_macos` / `yt-dlp_linux`)
- ffmpeg: gyan.dev (Windows, unchanged), evermeet.cx's stable release-redirect zip (macOS, x64 only), johnvansickle.com's static tar.xz (Linux x64)

**Alternatives considered:**
- Bundle a cross-platform npm package like `ffmpeg-static` instead of managing the download ourselves
- Support Apple Silicon natively via osxexperts.net instead of relying on Rosetta 2
- Use a different Linux extraction approach (an npm `tar` package + separate xz-decompression library) instead of shelling out to the system `tar` binary

**Reasoning:**
- These are exactly the sources the `ffmpeg-static` npm package (1,300+ GitHub stars, widely used in Electron apps) uses internally - verified via its `build/index.sh`, so this isn't a novel or unvetted choice
- Bundling `ffmpeg-static` as a dependency would pull its own binary download at `npm install` time, which conflicts with this project's existing pattern of downloading managed tools into the user's data directory at first app run, not at build time (see ADR-003)
- evermeet.cx publishes a documented, stable, version-agnostic redirect URL (`/ffmpeg/getrelease/ffmpeg/zip`); osxexperts.net's Apple Silicon builds only exist at version-specific filenames (e.g. `ffmpeg81arm.zip`) with no stable "latest" URL - even `ffmpeg-static` itself hardcodes a specific, aging osxexperts filename rather than trying to track their latest release automatically. Relying on Rosetta 2 (which macOS auto-installs on first x64 binary execution) avoids introducing a URL that would silently go stale between whisper.cpp app releases.
- `tar` and `xz-utils` are present on essentially every Linux distribution by default; adding an npm `tar` package would still require a separate xz-decompression library (Node's built-in `zlib` does not support xz/lzma), so shelling out to the system `tar -xJf` is less code and no new dependency, at the cost of assuming `tar` is on `PATH`

**Trade-offs:**
- Linux target is x86_64 only (`ffmpeg-release-amd64-static.tar.xz`); `arm64`/`armhf` Linux builds exist at johnvansickle.com but are not wired up
- macOS Apple Silicon users get an x64 binary running under Rosetta 2 rather than a native arm64 binary - slightly worse performance for ffmpeg operations, traded for not having a static build source with a stale-URL problem
- If `tar` is ever missing from a target Linux system (uncommon, but possible on a minimal container base image), ffmpeg setup fails with an explicit error naming the problem rather than silently working

---

## ADR-012: whisper.cpp builds from source on macOS/Linux instead of using an unofficial prebuilt binary

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** On macOS and Linux, `whisperManager.js` clones the pinned `whisper.cpp` tag and builds it locally with `cmake` (requiring `git`, `cmake`, and a C/C++ toolchain already on the machine), rather than downloading a prebuilt binary.

**Alternatives considered:**
- Download prebuilt binaries from `jiang1997/whisper.cpp-release`, a third-party GitHub repo that does publish cross-platform prebuilt whisper.cpp binaries via its own CI
- Wait for ggml-org (the upstream project) to publish official macOS/Linux binaries
- Ship a bundled precompiled binary per platform as part of the KineTube release itself

**Reasoning:**
- ggml-org's own GitHub releases (`https://github.com/ggml-org/whisper.cpp/releases`) confirmed to only publish Windows zips and WASM/xcframework artifacts - there is no official macOS/Linux CLI binary to point at
- `jiang1997/whisper.cpp-release` was created 2026-05-14, has 0 stars, and is maintained by a single individual with no track record. Downloading and executing an arbitrary binary from a brand-new, unaudited, single-maintainer source on every user's machine is a supply-chain risk this project declines to take, independent of whether that specific repo is currently trustworthy - the risk is in depending on it going forward with no ability to audit changes
- Building from source uses only the upstream project's own repository and a locally-installed, user-controlled toolchain (`git`, `cmake`, a compiler) - nothing is trusted except ggml-org's own source code, the same trust boundary the Windows path already has (an official ggml-org-published binary)

**Trade-offs:**
- This is meaningfully heavier than the other three tools: it requires a full C/C++ compiler toolchain already present on the machine (Xcode Command Line Tools on macOS, `build-essential` or equivalent on Linux), not just `git` and `cmake`. A missing compiler surfaces as a raw `cmake`/build error rather than a friendly upfront message, since verifying "is there a working C++ compiler" robustly across all Linux distributions and macOS versions is nontrivial - tracked as a rough edge in `docs/philosophy/CROSS_PLATFORM.md`
- A source build takes meaningfully longer than downloading a prebuilt zip (multi-minute compile vs. a fast download) - the SSE progress events reflect discrete phases (`cloning`, `configuring`, `building`) rather than a fine-grained percentage, since `cmake --build` doesn't expose one
- Not yet verified on real macOS/Linux hardware in this session (this dev environment is Windows-only) - see the verification table in `docs/philosophy/CROSS_PLATFORM.md`

---

## ADR-013: `server.js` exports the Express `app`, guarded by `require.main === module`

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** `backend/server.js` now does `module.exports = app;` right after all routes/middleware are registered, and only calls `startServer()` (port bind + binary setup checks) inside `if (require.main === module) { ... }`.

**Alternatives considered:**
- Leave `server.js` as an entry-point-only script and write a separate `app.js` that both `server.js` and tests import
- Test only via a real running server (spin up `node server.js` as a child process in a test harness, hit it over HTTP)

**Reasoning:**
- `require.main === module` is Node's standard, well-understood idiom for "this file's own code should only auto-run when it's the process entry point" - it needed no restructuring of the existing single-file layout, just moving the export earlier and adding the guard
- It is true for both of this file's actual entry-point invocations (`node server.js` in dev, Electron's `utilityProcess.fork(getServerPath())` in a packaged build) and false when a test file does `require('../server')`, which is exactly the distinction needed
- A separate `app.js` would have been a bigger diff for no behavioral benefit, and spinning up a real child-process server per test run would be slower and flakier (port collisions, startup race conditions) than driving the in-process `app` object with `supertest`

**Trade-offs:**
- Anyone reading `server.js` for the first time needs to know this idiom; it's called out explicitly in a comment at the export site and documented in `docs/architecture/backend/EXPRESS.md`
- Adds `supertest` as a new backend devDependency (see `docs/workflows/TESTING.md`) - the one exception to this project's general zero-new-test-dependency preference for the backend, justified because there is no way to drive Express routes via `node:test` alone without either this pattern or a real bound port

---

## ADR-014: Pinned `nsis.artifactName` to a space-free pattern to fix a broken auto-updater

**Date:** 2026-07-26
**Status:** Accepted

**Decision:** Set `build.nsis.artifactName` in `package.json` (root) to `${productName}-Setup-${version}.${ext}` instead of leaving it unset (electron-builder's NSIS default: `${productName} Setup ${version}.${ext}`, with literal spaces).

**Root cause found:** v1.3.0's in-app updater failed with `Cannot download ".../KineTube-Setup-1.3.0.exe", status 404`. This release workflow runs `electron-builder` with `--publish never` and then separately uploads `dist/*.exe` via `softprops/action-gh-release` - it never goes through electron-builder's own GitHub publish plugin, which is the only path that renames a built artifact to match the space-free name it also writes into `latest.yml`. Two independent things happened to the same unset-default filename (`KineTube Setup 1.3.0.exe`) and produced two different results: electron-builder's own `computeSafeArtifactNameIfNeeded()` (`app-builder-lib/out/platformPackager.js`) replaced the spaces with dashes when writing `dist/latest.yml` (`KineTube-Setup-1.3.0.exe`), while GitHub's release-asset upload API silently rewrote the same spaces to dots when the raw file was uploaded (`KineTube.Setup.1.3.0.exe`). `electron-updater` reads the dash name from `latest.yml`, requests it from the release, and gets a 404 because the asset that actually exists has dots.

**Alternatives considered:**
- Have the CI step rename `dist/*.exe` to strip spaces before upload, matching whatever electron-builder happened to write into `latest.yml`
- Switch the workflow to let electron-builder publish directly (`--publish always`) instead of a separate upload step

**Reasoning:**
- Pinning `artifactName` to an already GitHub-safe pattern (no spaces) makes `computeSafeArtifactNameIfNeeded()` a no-op (the suggested name is already safe, so `latest.yml` uses the real installer filename verbatim) and means GitHub's own upload sanitization has nothing to rewrite - both names converge on the same string with no second system in the loop
- A CI-side rename step would work but leaves the underlying default (a space-containing filename) as a trap for the next platform target or config change
- Switching to `--publish always` is a larger change to the release flow (electron-builder would then own asset upload/retry/auth end-to-end) that isn't warranted just to fix a filename mismatch

**Trade-offs:**
- Anyone adding another Windows target (e.g. a portable build) needs to keep its `artifactName` space-free too, or this class of bug reappears - called out in `docs/workflows/RELEASE.md`'s Auto-Update section
- Every future release must be spot-checked (`latest*.yml` filename vs. actual uploaded asset filename) until this is caught by an automated CI check instead of manual verification - tracked in `ROADMAP.md`
