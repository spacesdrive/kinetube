# Feature Development Workflow

Every feature - large or small - follows this sequence. Steps that don't apply to a specific feature can be skipped, but must be consciously skipped, not forgotten.

---

## Phase 1: Understand

**Step 1 - Read `CLAUDE.md`**
Confirm project context and which docs to load. This is required before starting any task in this repository.

**Step 2 - Load relevant documentation**
- Electron/main-process change -> `docs/architecture/electron/MAIN_PROCESS.md`
- Backend/route change -> `docs/architecture/backend/EXPRESS.md`, `ROUTES.md`
- Tool manager change -> `docs/architecture/backend/MANAGERS.md`, `docs/philosophy/CROSS_PLATFORM.md`
- Frontend change -> `docs/architecture/frontend/REACT_ARCHITECTURE.md`
- New platform target / packaging change -> `docs/workflows/RELEASE.md`, `docs/philosophy/CROSS_PLATFORM.md`

**Step 3 - Read the existing code in the affected area**
Read every file you will modify and its siblings. Do not start implementing until you understand the pattern already in use (e.g. read `ytdlpManager.js` in full before touching `whisperManager.js`).

**Step 4 - Search for existing implementations**
Grep for relevant function/component names. Is there already a manager, route, or component that does part of what you need?

---

## Phase 2: Research

**Step 5 - Look up library documentation (Context7)**
For Express 5, React 19, Electron APIs, `electron-updater`/`electron-builder`, `multer`, `unzipper` - confirm current API shape before writing code against training-data assumptions.

**Step 6 - Research tool behavior (Parallel Search)**
For anything involving yt-dlp, FFmpeg, whisper.cpp, or instaloader release assets, flags, or platform-specific packaging - these change over time and this project pins specific versions.

**Step 7 - Plan with Sequential Thinking**
Required for anything touching more than one layer (manager + route + frontend), or any change to how a tool is downloaded/located across platforms.

---

## Phase 3: Design

**Step 8 - Identify what changes**
- New/changed Express route(s)
- New/changed manager function(s)
- New/changed IPC channel
- New/changed frontend component(s) and where they plug into `App.jsx`'s view switching
- Any packaging/electron-builder config implications

**Step 9 - Identify reuse opportunities**
- Is there a manager function that already does most of what you need? Extend it rather than duplicating a download/spawn helper.
- Is there a shadcn component that fits? Use it.
- Does this operation need SSE? Reuse the `phase`/`progress`/`done`/`error` shape and `ProgressModal.jsx` rather than inventing new UI.

---

## Phase 4: Implement

**Step 10 - Implement in this order:**
1. Backend: manager function(s) in `backend/utils/`
2. Backend: route handler(s) in `backend/routes/`
3. Backend: mount in `backend/server.js` if a new router file
4. Electron: new IPC channel in `preload.js` + `main.js`, if needed
5. Frontend: new fetch/SSE call
6. Frontend: new/updated component
7. Frontend: wire into `App.jsx`'s view state

**Step 11 - Eliminate duplication**
Look for logic that duplicates something that already exists (a download-with-progress helper, a status-check pattern) and factor it out only if the duplication is genuinely costing maintainability - see `DECISIONS.md` for the existing tradeoff around the four managers' near-identical `downloadFileWithProgress()`.

---

## Phase 5: Verify

**Step 12 - Automated tests**
```bash
cd backend && npm test     # node:test - see docs/workflows/TESTING.md
cd frontend && npm test    # vitest
```

**Step 13 - Build verification**
```bash
cd frontend && npm run build   # must build without errors
cd frontend && npm run lint    # must pass with no errors
```

**Step 14 - Manual testing - golden path**
Run `npm run dev` from the repo root and exercise the change end-to-end in the actual Electron window, not just the Vite preview - IPC and packaged-vs-dev path resolution only surface in the real app.

**Step 15 - Manual testing - edge cases**
- Tool not installed yet (delete the relevant file from `backend/downloads/` and retest)
- Network failure mid-download
- Invalid/unsupported URL input
- Very large batch (Instagram profile bulk-download, large channel)

**Step 16 - Cross-platform sanity check**
If the change touches a manager or anything that shells out to a binary, explicitly ask: does this hardcode `.exe`, a Windows asset URL, or a `win32`-only path? If yes, and platform support isn't in scope for this change, note it in `docs/philosophy/CROSS_PLATFORM.md`'s gap list rather than leaving it undocumented.

**Step 17 - Console error check**
Open DevTools (F12) in the running app. No uncaught errors, no failed network requests, no React warnings.

---

## Phase 6: Document and Commit

**Step 18 - Update documentation**
Use the table in `CLAUDE.md` - Documentation Maintenance Policy.

**Step 19 - Update `CHANGELOG.md`**
Add an entry under `[Unreleased]`.

**Step 20 - Update `ROADMAP.md`**
If the feature was on the roadmap, move it to done. If it opened new follow-up work, add it.

**Step 21 - Commit**
Follow `docs/workflows/GIT.md`.

**Step 22 - Release (if ready)**
Follow `docs/workflows/RELEASE.md`.
