# KineTube - AI Operating Manual

## Project Identity

KineTube is a privacy-first desktop application for downloading YouTube and Instagram media and transcribing it locally with Whisper. It ships as an Electron app for Windows, macOS, and Linux. There is no backend service, no account system, and no telemetry - every request the app makes goes to YouTube, Instagram, or a tool's own release/model host, and every file it produces stays on the user's disk.

- Primary users: People who want to save YouTube/Instagram media and transcripts without a subscription or a cloud service
- Primary value: One-click download and transcription backed by yt-dlp, FFmpeg, whisper.cpp, and instaloader, auto-installed on first run
- Current platforms: YouTube (video/Shorts/channel/playlist download, MP3 extraction), Instagram (posts/Reels/stories/profile bulk-download), local Whisper transcription
- GitHub repository: https://github.com/spacesdrive/kinetube

---

## Reading Order Before Any Change

Read these in order before writing code. This is not optional - the user has directed that `CLAUDE.md` be read before every task.

1. This file - project identity, rules, and documentation map
2. `docs/WRITING_STANDARDS.md` - typography, icons, writing style, UI copy rules
3. `docs/architecture/OVERVIEW.md` - process topology and request lifecycle
4. `docs/guidelines/JAVASCRIPT.md` - code standards (always apply)
5. The relevant architecture doc - electron, backend, or frontend
6. The relevant feature guide, if one exists in `docs/features/`
7. `docs/philosophy/CROSS_PLATFORM.md` - required reading for anything touching yt-dlp, FFmpeg, whisper.cpp, or instaloader, since today's tool managers are Windows-only (see Known Issues below)

For MCP usage, read `docs/mcp/OVERVIEW.md` before using Context7, Parallel Search, Sequential Thinking, or Filesystem.

---

## Documentation Map

```
docs/
  WRITING_STANDARDS.md        Typography, icons, writing style, UI copy, commit messages
  architecture/
    OVERVIEW.md                Process topology, IPC, request lifecycle, data storage
    electron/
      MAIN_PROCESS.md          main.js responsibilities, window lifecycle, updater, IPC
    backend/
      EXPRESS.md                App structure, middleware, CORS, static serving in prod
      ROUTES.md                 All routes: method, purpose, streaming behavior
      MANAGERS.md               yt-dlp / ffmpeg / whisper / instaloader manager contracts
    frontend/
      REACT_ARCHITECTURE.md    Component tree, state, shadcn usage, SSE consumption
  guidelines/
    JAVASCRIPT.md              Code style, modules, naming, comments policy
    REACT.md                   Component rules, hooks, JSX conventions
    NAMING.md                  File names, function names, variable names
    ERROR_HANDLING.md          Route errors, SSE error events, IPC errors, logging
  workflows/
    FEATURE_DEVELOPMENT.md     Step-by-step feature implementation sequence
    TESTING.md                 Test runner, what is covered, manual verification checklist
    GIT.md                     Commit format, branch rules, changelog policy
    RELEASE.md                 electron-builder targets, versioning, GitHub Actions release flow
  features/
    NEW_API_ROUTE.md           Add a route to the Express backend
    NEW_TOOL_MANAGER.md        Add or extend a managed external binary (yt-dlp-style)
  philosophy/
    ARCHITECTURE.md            Architectural principles and constraints
    CROSS_PLATFORM.md          Windows-only tool bug, what "supporting a platform" requires

DECISIONS.md       Architectural decision log
CHANGELOG.md       Version history and feature changes
ROADMAP.md         Planned features and priorities
```

Every doc referenced above exists in the repository. If you add a new architectural layer, add its doc here in the same pass - do not leave the map pointing at nothing.

---

## Writing and Design Standards

Read `docs/WRITING_STANDARDS.md` for the full specification. The non-negotiable rules:

- Never use emojis, em dashes, or emoticons in code, docs, commit messages, or UI copy (console log lines that predate this policy are legacy - do not add new ones)
- Use Lucide React SVG icons in the UI - never emoji as icons
- Write clear, professional English with no marketing buzzwords or filler text
- UI copy names things from the user's perspective ("Download folder", not "outputDir")
- Error messages explain what went wrong and what to do - never "Something went wrong"
- One comment per non-obvious logic block, maximum - never restate what the code does
- Every page feels like it belongs to the same app: consistent padding, shadcn cards, consistent toast usage (Sonner)

---

## Engineering Standards

Act like a senior engineer shipping a desktop application that runs unattended on someone else's machine, with no server to patch remotely except through the auto-updater.

Every implementation must be:

- Cross-platform aware - Windows, macOS, and Linux are all shipped by `.github/workflows/release.yml`. Code that assumes `process.platform === 'win32'` or hardcodes a `.exe` suffix must say so explicitly and be treated as a gap, not silently merged. See `docs/philosophy/CROSS_PLATFORM.md`.
- Resilient to missing tools - yt-dlp, FFmpeg, whisper.cpp, and instaloader are downloaded on demand. Every code path that shells out to one of them must handle "not installed yet" without crashing the Express process.
- Non-blocking on startup - the Express server must start and answer `/health` before any binary check or download begins (see `backend/server.js`); Electron's `waitForServer()` depends on this.
- Documented - routes, IPC channels, env vars, and tool-manager contracts are reflected in docs
- Production-ready - proper error handling at every boundary (route handler, SSE stream, IPC handler), no debug `console.log` left in hot paths

Never implement the quickest solution when a significantly better architecture exists. Optimize for long-term maintainability over short-term speed.

---

## MCP Usage Rules

### Context7 - Library and API documentation

Use Context7 before implementing anything that involves an external library or API, even well-known ones:

- Express 5, React 19, Vite, Tailwind CSS v4, shadcn/ui (base-nova style)
- Electron (`BrowserWindow`, `utilityProcess`, `ipcMain`/`ipcRenderer`, `autoUpdater`)
- `electron-updater`, `electron-builder` configuration
- `multer`, `unzipper`, `cors`
- Any third-party package

Do not rely on training knowledge for library APIs - it goes stale. Workflow: `resolve-library-id` first, then `query-docs` with the full question.

### Parallel Search - Research and best practices

Use Parallel Search when:

- Researching how yt-dlp, whisper.cpp, or instaloader expose a new CLI flag or release asset naming convention
- Checking current platform-specific packaging requirements (macOS notarization, Linux AppImage/deb conventions)
- Comparing UX patterns for progress/streaming UI
- Checking accessibility requirements for a new component

### Sequential Thinking - Complex planning

Use Sequential Thinking before implementing any feature that touches more than one layer (Electron + backend, or a new tool manager end-to-end), or before deciding how to make an existing Windows-only code path cross-platform.

### Filesystem MCP - File operations

Use it for multi-file reads, directory trees, and refactors that span many files. For a single known path or string, prefer the built-in Read/Grep/Glob tools - they are faster.

---

## Pre-Feature Research Protocol

Before adding any feature that touches an external tool (yt-dlp, FFmpeg, whisper.cpp, instaloader) or a new platform target:

1. Confirm the current behavior on Windows by reading the relevant manager in `backend/utils/`
2. Research the equivalent behavior needed on macOS/Linux (binary name, install source, permissions) using Parallel Search
3. Fetch current library documentation via Context7 for anything Electron- or Express-related
4. Plan the change with Sequential Thinking if it spans the manager, the route, and the frontend

This is not optional for anything under `docs/features/NEW_TOOL_MANAGER.md`.

---

## AI Operating Rules

**Always read before writing.** Read every file you will modify. Read sibling files in the same directory to understand conventions before adding new ones.

**Match the existing pattern.** Route handlers follow the shape in `backend/routes/download.js`. Tool managers follow the shape in `backend/utils/ytdlpManager.js` (download-with-progress, `ensureX()`, status check). Frontend components follow the shape of existing `frontend/src/components/*.jsx` files and use shadcn primitives from `frontend/src/components/ui/`.

**No TypeScript.** The entire project - backend and frontend - is JavaScript/JSX. Do not introduce TypeScript unless explicitly asked.

**Minimal dependencies.** The backend currently depends on `cors`, `express`, `multer`, `unzipper`. The frontend depends on a small, deliberate shadcn/Tailwind stack. Adding a package (including a test framework) should use what the runtime already provides where reasonable - Node's built-in `node:test` runner is preferred over adding Jest/Mocha for backend logic.

**Security invariants - never violate these:**
- The image proxy in `backend/server.js` (`/api/proxy/img`) only ever fetches from the allow-listed CDN hostnames in `IMG_PROXY_ALLOWED` - never widen this without equivalent SSRF review
- Instagram session files under `backend/sessions/` (or the packaged app's `userData/sessions/`) are never read by any route other than the instaloader manager and are never returned in an API response
- `backend/.env`, `backend/sessions/`, `backend/downloads/`, `backend/models/` are never committed - `extraResources.filter` in `package.json` must keep excluding binaries and user data from the packaged app's writable copy
- All paths that must be writable in a packaged app go through `backend/utils/paths.js` (`ELECTRON_USER_DATA`), never a hardcoded path relative to `__dirname`

**Use the established manager pattern.** All external-tool orchestration (download, extract, locate, spawn) lives in `backend/utils/*Manager.js`. Route handlers call into a manager - they never `spawn()` a tool binary directly.

**SSE is the streaming contract.** Long-running operations (download, transcription, setup) stream progress to the frontend via Server-Sent Events, not polling. Follow the `phase` / `progress` / `done` / `error` event shape already used in `ytdlpManager.js`, `whisperManager.js`, and the corresponding routes.

**Documentation is part of implementation.** When routes, IPC channels, env vars, packaging config, tool-manager contracts, or component conventions change, update the relevant docs immediately using the table below.

---

## Git and Commit Standards

- Repository: https://github.com/spacesdrive/kinetube
- Author name: spacesdrive
- Author email: valzorx7@gmail.com
- Read `docs/workflows/GIT.md` for the full commit format

Commit after every meaningful, self-contained change. Do not batch unrelated changes into one commit. Use Conventional Commits format:

```
type(scope): short imperative description

Optional body explaining why, not what.
```

Tag releases after shipping a meaningful set of changes:
- Bug fixes: patch version (v1.1.1, v1.1.2)
- New features: minor version (v1.2.0)
- Breaking changes: major version (v2.0.0)

Do not add "Co-Authored-By: Claude" lines to commit messages unless the user's tooling requires it; match whatever convention the existing commit history shows.

---

## Known Issues to Keep Front of Mind

- **The tool managers are Windows-only today.** `backend/utils/ytdlpManager.js`, `whisperManager.js`, and `instaloaderManager.js` all download a `.exe`/`-windows-` asset unconditionally and spawn it by a hardcoded path. The macOS and Linux electron-builder targets in `package.json` produce installable artifacts, but the app's core features (download, transcription, Instagram scraping) do not work on those platforms yet. See `docs/philosophy/CROSS_PLATFORM.md` for the full breakdown and what fixing each manager requires.
- Any change to a manager should ask: "does this hardcode `.exe`, a Windows asset URL, or a `win32`-only spawn path?" If yes, it belongs in the cross-platform doc's tracked gap list, not silently shipped as if it were platform-agnostic.

---

## Documentation Maintenance Policy

When anything changes, update every relevant docs file from the table below.

| What changed | Files to update |
|---|---|
| New Express route | `docs/architecture/backend/ROUTES.md`, `docs/workflows/TESTING.md` (manual checklist) |
| Route deleted or changed | `docs/architecture/backend/ROUTES.md` |
| New or changed tool manager | `docs/architecture/backend/MANAGERS.md`, `docs/philosophy/CROSS_PLATFORM.md` if it affects platform support, `DECISIONS.md` |
| New IPC channel (main <-> renderer) | `docs/architecture/electron/MAIN_PROCESS.md` |
| New env var | `docs/architecture/backend/EXPRESS.md`, `docs/workflows/RELEASE.md` if it affects packaging |
| New npm dependency (backend or frontend) | `DECISIONS.md` |
| New frontend component/page | `docs/architecture/frontend/REACT_ARCHITECTURE.md` |
| electron-builder / packaging config changed | `docs/workflows/RELEASE.md`, `DECISIONS.md` |
| New GitHub Actions workflow or step | `docs/workflows/RELEASE.md` |
| Architecture decision made | `DECISIONS.md` (append only, never delete) |
| Any feature shipped | `CHANGELOG.md` (append to Unreleased section) |
| Release tagged | `CHANGELOG.md` (convert Unreleased to version number with date) |
| Any planned feature added or changed | `ROADMAP.md` |
| Writing or design rule changed | `docs/WRITING_STANDARDS.md`, this file (Writing and Design Standards section) |
| Engineering standard changed | `docs/philosophy/ARCHITECTURE.md`, this file (Engineering Standards section) |
| Testing approach changed | `docs/workflows/TESTING.md` |
| Feature guide added or changed | `docs/features/` (relevant file) |
| README setup or feature list changes | `README.md` |
