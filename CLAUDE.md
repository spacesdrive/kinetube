# KineTube: AI Operating Manual

## Project Identity

KineTube is a privacy-first desktop application for downloading YouTube and Instagram media and transcribing it locally with Whisper. It ships as an Electron app for Windows, macOS, and Linux. There is no backend service, no account system, and no telemetry. Every request the app makes goes to YouTube, Instagram, or a tool's own release/model host, and every file it produces stays on the user's disk.

- Primary users: People who want to save YouTube/Instagram media and transcripts without a subscription or a cloud service
- Primary value: One-click download and transcription backed by yt-dlp, FFmpeg, whisper.cpp, and instaloader, auto-installed on first run
- Current platforms: YouTube (video, Shorts and channel download, MP3 extraction; playlist links are not supported), Instagram (posts/Reels/stories/profile bulk-download), local Whisper transcription
- GitHub repository: https://github.com/spacesdrive/kinetube

The codebase is strict TypeScript in four projects: `backend/` (Express 5 API), `frontend/` (React 19 and Vite), `electron/` (main process and preload) and `shared/types/` (the API contract all three import).

---

## Reading Order Before Any Change

Read these in order before writing code. This is not optional: the user has directed that `CLAUDE.md` be read before every task.

1. This file: project identity, rules, and documentation map
2. `docs/WRITING_STANDARDS.md`: typography, icons, writing style, UI copy rules
3. `docs/architecture/OVERVIEW.md`: process topology and request lifecycle
4. `docs/guidelines/TYPESCRIPT.md`: code standards (always apply)
5. The relevant architecture doc: electron, backend, or frontend
6. The relevant feature guide, if one exists in `docs/features/`
7. `docs/philosophy/CROSS_PLATFORM.md`: required reading for anything touching yt-dlp, FFmpeg, whisper.cpp, or instaloader, since the macOS and Linux paths are implemented but not yet verified on real hardware

For MCP usage, read `docs/mcp/OVERVIEW.md` before using Context7, Parallel Search, Sequential Thinking, or Filesystem.

---

## Documentation Map

```
docs/
  WRITING_STANDARDS.md        Typography, icons, writing style, UI copy, commit messages
  api/
    openapi.yaml               OpenAPI 3.1 description of /api/v1
  architecture/
    OVERVIEW.md                Process topology, IPC, request lifecycle, data storage
    electron/
      MAIN_PROCESS.md          Main process modules, window lifecycle, updater, IPC
    backend/
      EXPRESS.md                Layers, middleware, origin guard, static serving in prod
      ROUTES.md                 All /api/v1 routes, stream events, old-to-new route table
      MANAGERS.md               yt-dlp / ffmpeg / whisper / instaloader manager contracts
    frontend/
      REACT_ARCHITECTURE.md    Component tree, state, shadcn usage, stream consumption
  guidelines/
    TYPESCRIPT.md              Code style, compiler settings, modules, comments policy
    REACT.md                   Component rules, hooks, TSX conventions
    NAMING.md                  File names, function names, variable names
    ERROR_HANDLING.md          AppError classes, stream errors, IPC errors, logging
  workflows/
    FEATURE_DEVELOPMENT.md     Step-by-step feature implementation sequence
    TESTING.md                 Test runners, what is covered, manual verification checklist
    GIT.md                     Commit format, branch rules, changelog policy
    RELEASE.md                 Build steps, electron-builder targets, GitHub Actions release flow
  features/
    NEW_API_ROUTE.md           Add a route to the Express backend
    NEW_TOOL_MANAGER.md        Add or extend a managed external binary (yt-dlp-style)
  philosophy/
    ARCHITECTURE.md            Architectural principles and constraints
    CROSS_PLATFORM.md          Per-platform tool support and what is still unverified

DECISIONS.md       Architectural decision log
CHANGELOG.md       Version history and feature changes
ROADMAP.md         Planned features and priorities
```

Every doc referenced above exists in the repository. If you add a new architectural layer, add its doc here in the same pass. Do not leave the map pointing at nothing.

---

## Writing and Design Standards

Read `docs/WRITING_STANDARDS.md` for the full specification. The non-negotiable rules:

- Never use emojis, emoticons, em dashes, en dashes, or a spaced hyphen used as a dash in code, docs, commit messages, or UI copy; rewrite with a full stop, comma, colon or parentheses
- Use Lucide React SVG icons in the UI, never emoji as icons
- Write clear, professional English with no marketing buzzwords or filler text
- UI copy names things from the user's perspective ("Download folder", not "outputDir")
- Error messages explain what went wrong and what to do, never "Something went wrong"
- One comment per non-obvious logic block, maximum. Never restate what the code does
- Every page feels like it belongs to the same app: consistent padding, shadcn cards, consistent toast usage (Sonner)

---

## Engineering Standards

Act like a senior engineer shipping a desktop application that runs unattended on someone else's machine, with no server to patch remotely except through the auto-updater.

Every implementation must be:

- Cross-platform aware: Windows, macOS, and Linux are all shipped by `.github/workflows/release.yml`. Platform differences live in the managers' `*Binary.ts` files, which map `process.platform` to an asset name and a binary path. Code that only works on one platform must say so and answer `NotSupportedError` (501) elsewhere. See `docs/philosophy/CROSS_PLATFORM.md`.
- Resilient to missing tools: yt-dlp, FFmpeg, whisper.cpp, and instaloader are downloaded on demand. Every code path that shells out to one of them must handle "not installed yet" (`ToolNotInstalledError`) without crashing the Express process.
- Non-blocking on startup: the Express server must start and answer `/health` before any binary check or download begins (see `backend/src/server.ts`); Electron's health check in `electron/src/backendProcess.ts` depends on this.
- Documented: routes, IPC channels, env vars, and tool-manager contracts are reflected in docs
- Production-ready: errors are typed `AppError`s handled at every boundary (error handler, stream, IPC handler), and no debug logging is left in hot paths

Never implement the quickest solution when a significantly better architecture exists. Optimize for long-term maintainability over short-term speed.

---

## MCP Usage Rules

### Context7: Library and API documentation

Use Context7 before implementing anything that involves an external library or API, even well-known ones:

- TypeScript, Express 5, React 19, Vite, Vitest, Tailwind CSS v4, shadcn/ui (base-nova style on Base UI)
- Electron (`BrowserWindow`, `utilityProcess`, `ipcMain`/`ipcRenderer`, `autoUpdater`)
- `electron-updater`, `electron-builder` configuration
- `multer`, `unzipper`, `supertest`
- Any third-party package

Do not rely on training knowledge for library APIs, because it goes stale. Workflow: `resolve-library-id` first, then `query-docs` with the full question.

### Parallel Search: Research and best practices

Use Parallel Search when:

- Researching how yt-dlp, whisper.cpp, or instaloader expose a new CLI flag or release asset naming convention
- Checking current platform-specific packaging requirements (macOS notarization, Linux AppImage/deb conventions)
- Comparing UX patterns for progress/streaming UI
- Checking accessibility requirements for a new component

### Sequential Thinking: Complex planning

Use Sequential Thinking before implementing any feature that touches more than one layer (Electron + backend, or a new tool manager end-to-end), or before changing how a tool behaves on one platform.

### Filesystem MCP: File operations

Use it for multi-file reads, directory trees, and refactors that span many files. For a single known path or string, prefer the built-in Read/Grep/Glob tools, which are faster.

---

## Pre-Feature Research Protocol

Before adding any feature that touches an external tool (yt-dlp, FFmpeg, whisper.cpp, instaloader) or a new platform target:

1. Confirm the current behavior by reading the relevant manager in `backend/src/managers/`
2. Research the equivalent behavior needed on each platform (binary name, install source, permissions) using Parallel Search
3. Fetch current library documentation via Context7 for anything Electron- or Express-related
4. Plan the change with Sequential Thinking if it spans the manager, the route, and the frontend

This is not optional for anything under `docs/features/NEW_TOOL_MANAGER.md`.

---

## AI Operating Rules

**Always read before writing.** Read every file you will modify. Read sibling files in the same directory to understand conventions before adding new ones.

**Contract first.** A new or changed endpoint starts in `shared/types/`, then `docs/api/openapi.yaml`, then the backend and the frontend. The backend and frontend import shared types with `import type` only.

**Match the existing pattern.** The backend is layered: `routes/` (route tables) → `validators/` → `controllers/` → `services/` → `stores/` and `managers/`. `routes/downloadRoutes.ts` with `controllers/downloadController.ts` is the reference route. `managers/ytdlp/` is the reference tool manager (binary, release, process and manager files). Frontend features live in `frontend/src/features/<area>/`, talk to the backend only through `frontend/src/services/api.ts`, and use shadcn primitives from `frontend/src/components/ui/`.

**TypeScript rules.** Strict mode with `noUncheckedIndexedAccess`. No `any`, `enum`, namespaces, `@ts-ignore` or non-null assertions; narrow with a check instead. Use `import type` for types. Backend imports keep their `.ts` extension. See `docs/guidelines/TYPESCRIPT.md`.

**Minimal dependencies.** The backend depends on `express`, `multer` and `unzipper`. The frontend depends on a small, deliberate shadcn/Tailwind stack. Adding a package (including a test framework) should use what the runtime already provides where reasonable. Node's built-in `node:test` runner covers the backend, and Vitest covers the frontend.

**Security invariants (never violate these):**
- The backend listens on `127.0.0.1` only, and `backend/src/middleware/originGuard.ts` refuses a foreign Host or Origin. Never loosen either without a DNS-rebinding and CSRF review
- The image proxy (`GET /api/v1/images`) only ever fetches over https from the hosts in `IMAGE_PROXY_ALLOWED_HOSTS` in `backend/src/services/imageProxyService.ts`, matched exactly or as a real subdomain, with every redirect checked. Never widen this without equivalent SSRF review
- Every link sent to yt-dlp is parsed by the platform URL parsers and passed after `--`; user input never becomes a yt-dlp option
- Instagram session files under `backend/sessions/` (or the packaged app's `userData/sessions/`) are never read by any route other than the instaloader manager and are never returned in an API response; usernames are validated before they become file names
- `backend/.env`, `backend/sessions/`, `backend/downloads/`, `backend/models/` are never committed, and `extraResources.filter` in `package.json` must keep excluding binaries and user data from the packaged app's writable copy
- All paths that must be writable in a packaged app go through `backend/src/lib/paths.ts` (`ELECTRON_USER_DATA`), never a hardcoded path relative to the source file

**Use the established manager pattern.** All external-tool orchestration (download, extract, locate, spawn) lives in `backend/src/managers/`. Services call into a manager; nothing else spawns a tool binary.

**Streams are the long-task contract.** Long-running operations (download, transcription, installs) are POST requests that answer `text/event-stream`, not polling. Events are typed in `shared/types/`; every stream ends with exactly one `done` event, which carries the result or the error `code` and `message`. The one exception is a paused download, which ends with `paused`. The frontend reads streams through `frontend/src/services/eventStream.ts`. See `docs/architecture/backend/ROUTES.md`.

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

Before committing, run `npm run typecheck` and `npm test` from the repository root.

Tag releases after shipping a meaningful set of changes:
- Bug fixes: patch version (v1.1.1, v1.1.2)
- New features: minor version (v1.2.0)
- Breaking changes: major version (v2.0.0)

Do not add "Co-Authored-By: Claude" lines to commit messages unless the user's tooling requires it; match whatever convention the existing commit history shows.

---

## Known Issues to Keep Front of Mind

- **macOS and Linux tool support is implemented but not verified on real hardware.** Each manager picks its asset by platform, but only the Windows paths have been run end to end. See `docs/philosophy/CROSS_PLATFORM.md`.
- **The folder picker fallback is Windows-only.** `POST /api/v1/folders/pick` answers 501 on other platforms. The desktop app uses Electron's own dialog, so only the browser dev fallback is affected.
- **Instagram post downloads run logged out.** yt-dlp cannot read instaloader's session file (`DECISIONS.md` ADR-030); profiles still use the session.
- Any change to a manager should ask: "does this only work on one platform?" If yes, it belongs in the cross-platform doc's tracked gap list, not silently shipped as if it were platform-agnostic.

---

## Documentation Maintenance Policy

When anything changes, update every relevant docs file from the table below.

| What changed | Files to update |
|---|---|
| New Express route | `shared/types/`, `docs/api/openapi.yaml`, `docs/architecture/backend/ROUTES.md`, `docs/workflows/TESTING.md` (manual checklist) |
| Route deleted or changed | `shared/types/`, `docs/api/openapi.yaml`, `docs/architecture/backend/ROUTES.md` |
| New or changed tool manager | `docs/architecture/backend/MANAGERS.md`, `docs/philosophy/CROSS_PLATFORM.md` if it affects platform support, `DECISIONS.md` |
| New IPC channel (main <-> renderer) | `shared/types/electron.ts`, `docs/architecture/electron/MAIN_PROCESS.md` |
| New env var | `docs/architecture/backend/EXPRESS.md`, `docs/workflows/RELEASE.md` if it affects packaging |
| New npm dependency (backend or frontend) | `DECISIONS.md` |
| New frontend component/page | `docs/architecture/frontend/REACT_ARCHITECTURE.md` |
| TypeScript or build config changed | `docs/guidelines/TYPESCRIPT.md`, `docs/workflows/RELEASE.md` if it affects packaging |
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
