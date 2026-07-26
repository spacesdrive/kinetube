# Architectural Principles

## Core Principles

### 1. The backend does all the heavy lifting; the renderer does none of it

Every filesystem write, every subprocess spawn, every network call to YouTube/Instagram/GitHub/Hugging Face happens in the Express backend. The React renderer only calls the backend's HTTP/SSE API and, for the handful of OS-level capabilities it needs (folder picker, updater), the narrow IPC bridge in `preload.js`.

**Why:** `contextIsolation: true` and `nodeIntegration: false` mean the renderer has no Node.js access at all. Centralizing subprocess/filesystem work in one process also means there is exactly one place that needs to reason about packaged-vs-dev paths (`backend/utils/paths.js`).

### 2. External tools are managed, not bundled

yt-dlp, FFmpeg, whisper.cpp, and instaloader are not shipped inside the installer. They are downloaded on first run into the user's writable data directory. See `docs/architecture/backend/MANAGERS.md`.

**Why:** These tools update frequently (yt-dlp in particular, to keep up with YouTube changes) and are large. Managing them at runtime keeps the installer small and lets the app self-heal an outdated yt-dlp without an app update. The cost is that **every fresh install requires internet access and a successful download before the app is useful**, and today that download logic is Windows-only - see `docs/philosophy/CROSS_PLATFORM.md`.

### 3. One writable data root, resolved once

`backend/utils/paths.js` is the single place that decides where downloads, models, and sessions live, based on whether `ELECTRON_USER_DATA` is set. Every manager imports `DOWNLOADS_DIR`/`MODELS_DIR`/`SESSIONS_DIR` from there.

**Why:** A packaged Windows app cannot write into its own install directory under `Program Files`. Resolving this in one module means no other file has to know or care whether it's running packaged or in dev - see `DECISIONS.md` for the ADR that introduced this after packaged installs broke.

### 4. Streaming operations share one event contract

Any operation that takes more than an instant - download, transcription, first-run setup - streams `phase`/`progress`/`done`/`error` events over SSE, consumed by one shared frontend component (`ProgressModal.jsx`).

**Why:** Without a shared contract, each feature would grow its own bespoke progress UI and its own ad hoc event shape, and the frontend would need a different parser per feature. See `docs/guidelines/ERROR_HANDLING.md`.

### 5. No accounts, no telemetry, no cloud dependency

There is no user authentication, no analytics collection, and no server this app depends on other than the third-party services it's explicitly fetching from (YouTube, Instagram, GitHub Releases, Hugging Face). Nothing the app produces (downloaded media, transcripts, session cookies) leaves the user's machine.

**Why:** This is the product's core value proposition (see `README.md`), not an incidental implementation detail. Any feature proposal that would send user data off-device (crash reporting, usage analytics, cloud sync) is a scope change big enough to need explicit user sign-off, not something to add opportunistically.

### 6. No TypeScript anywhere

The entire project - Electron main process, Express backend, React frontend - is plain JavaScript/JSX.

**Why:** Reduces build tooling surface area (no `tsc` step in either the backend's CommonJS setup or the Vite build). The project is small enough that naming conventions and `docs/guidelines/NAMING.md` provide adequate clarity without static types.

## What This Architecture Is Not

**Not a client-server product.** There is no multi-user concept, no remote database, no service the developer operates. "Backend" here means "the Express process this desktop app spawns locally," not a hosted API.

**Not fully cross-platform yet, despite building for three platforms.** The build pipeline produces Windows, macOS, and Linux artifacts, but the tool managers only work on Windows today. Treat "the app is cross-platform" and "the app builds for three platforms" as two different, currently-unequal claims - see `docs/philosophy/CROSS_PLATFORM.md`.

**Not offline-capable on first run.** Every tool, model, and piece of media the app touches is fetched from the internet. "Privacy-first" in this project means "no data leaves the machine," not "works with no network."

## When to Break These Rules

Breaking any of these principles requires an explicit entry in `DECISIONS.md`:
- Bundling a tool binary directly into the installer instead of downloading it at runtime: document the size/update-cadence tradeoff
- Adding any form of telemetry: document exactly what is collected and get explicit user sign-off first - this cuts against the product's stated privacy value proposition
- Adding TypeScript: document the measurable benefit
- Weakening `contextIsolation`/`nodeIntegration` in `BrowserWindow`: document the specific capability that requires it and the mitigation
