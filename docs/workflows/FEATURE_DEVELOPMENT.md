# Feature development workflow

Every feature, large or small, follows this sequence. You can skip a step that does not apply, but skip it on purpose and not by accident.

For the two most common changes there is a detailed guide:

- A new endpoint under `/api/v1`: `docs/features/NEW_API_ROUTE.md`
- A new or changed external tool (yt-dlp, FFmpeg, whisper.cpp, instaloader): `docs/features/NEW_TOOL_MANAGER.md`

---

## Phase 1: Understand

### Step 1: Open a GitHub issue

Open an issue at https://github.com/spacesdrive/kinetube/issues before you write any code. Say what is wrong or missing and what done looks like, and give it one label: `bug`, `enhancement` or `documentation`. Every commit for the work names the issue. See "GitHub issues" in `docs/workflows/GIT.md`.

### Step 2: Read `CLAUDE.md`

It names the project rules and the docs to load for each kind of change. Read it before any task in this repository.

### Step 3: Load the docs for the area you touch

| Change | Read |
|---|---|
| Electron main process, IPC, updater | `docs/architecture/electron/MAIN_PROCESS.md` |
| Backend pipeline, config, env vars | `docs/architecture/backend/EXPRESS.md` |
| Routes, status codes, stream events | `docs/architecture/backend/ROUTES.md` |
| Tool managers | `docs/architecture/backend/MANAGERS.md`, `docs/philosophy/CROSS_PLATFORM.md` |
| Frontend pages, features, components | `docs/architecture/frontend/REACT_ARCHITECTURE.md` |
| Anything you can see in the UI | `docs/design-reference.md`, `docs/WRITING_STANDARDS.md` (UI copy) |
| Packaging or a new platform target | `docs/workflows/RELEASE.md`, `docs/philosophy/CROSS_PLATFORM.md` |
| Code style | `docs/guidelines/TYPESCRIPT.md`, `docs/guidelines/REACT.md`, `docs/guidelines/NAMING.md`, `docs/guidelines/ERROR_HANDLING.md` |

### Step 4: Read the code you will change

Read every file you will modify and its siblings in the same folder. For example, read `backend/src/controllers/toolController.ts` and `backend/src/routes/toolRoutes.ts` before you add a controller and a route table of your own.

### Step 5: Search for code that already does part of the job

Search `backend/src/lib/`, `backend/src/services/`, `frontend/src/hooks/` and `frontend/src/lib/` first. Helpers for streams (`lib/sse.ts`, `controllers/http.ts`), child processes (`lib/runProcess.ts`, `lib/processTree.ts`), file downloads (`lib/httpDownload.ts`) and archives (`lib/archives.ts`) already exist.

---

## Phase 2: Research

### Step 6: Look up library documentation with Context7

Check the current API of Express 5, React 19, Vite, Vitest, Electron (`utilityProcess`, `ipcMain`, `contextBridge`), `electron-updater`, `electron-builder` and `multer` before you write code against them.

### Step 7: Research tool behavior with Parallel Search

yt-dlp, FFmpeg, whisper.cpp and instaloader change their flags and release assets over time. Check the current behavior for every platform you touch.

### Step 8: Plan with Sequential Thinking

Plan first when the change touches more than one layer (for example a manager, a service and a frontend feature), or when it changes how a tool is downloaded or located on any platform.

---

## Phase 3: Design

### Step 9: List what changes

- Shared types in `shared/types/` (request, response and stream-event shapes)
- Backend: route table, validator, controller, service, store, manager
- Electron: an IPC channel, if the page needs something only the main process can do
- Frontend: methods in `src/services/api.ts`, a feature folder in `src/features/`, and where it plugs into `src/AppShell.tsx` or `src/pages/DownloadPage.tsx`
- Packaging: anything `package.json` `build` must include or exclude

### Step 10: Reuse what fits

- Long work streams its progress. Return a `StreamJob` from the service and send it with `sendStream` in the controller. The last event is always `done`.
- Errors are `AppError` subclasses from `backend/src/lib/errors.ts` (`ValidationError`, `NotFoundError`, `ConflictError`, `ToolNotInstalledError` and others). The error handler turns them into the one JSON error shape.
- Build screens from the patterns in `frontend/src/components/patterns/` and the shadcn primitives in `frontend/src/components/ui/`, styled with the token classes, with Lucide icons. Reuse `ProgressModal` for download progress instead of building a new progress view.
- Show short-lived results with a Sonner toast, and guard destructive actions with `HoldToConfirmButton`. See `docs/guidelines/REACT.md`.

---

## Phase 4: Implement

### Step 11: Build the layers in this order

1. Shared types. Add or extend a file in `shared/types/` (`api`, `tools`, `youtube`, `instagram`, `downloads`, `transcriptions`, `folders`, `electron`). These files hold types only. The backend, frontend and Electron import them type-only through the `@shared/*` alias or a relative path.
2. Manager, only if an external tool is involved. Each tool has a folder in `backend/src/managers/` (`ytdlp/`, `ffmpeg/`, `whisper/`, `instaloader/`) that downloads, installs, locates and spawns it. Only managers spawn tool binaries. See `docs/features/NEW_TOOL_MANAGER.md`.
3. Platform parsing, only for new link shapes. URL parsers and yt-dlp JSON mappers live in `backend/src/platforms/` and stay pure, so they are easy to test.
4. Store, only for state that must survive a restart. JSON-file stores live in `backend/src/stores/` and write through `jsonFile.ts`.
5. Service in `backend/src/services/`. It holds the business rules and calls managers and stores. Register it in `createServices` in `backend/src/container.ts`.
6. Validator in `backend/src/validators/`. It turns untrusted input (body, query, params) into a typed request and throws `ValidationError` or `NotFoundError`. Shared field helpers are in `validators/fields.ts`.
7. Controller in `backend/src/controllers/`. It validates the input, calls one service method, and sends `dataResponse`, `listResponse` or `sendStream` from `controllers/http.ts`.
8. Route table in `backend/src/routes/`. Add the route to the resource's table, or create a table and mount it in `routes/apiRouter.ts`. See `docs/features/NEW_API_ROUTE.md`.
9. Electron IPC, only if needed. Add the handler in `electron/src/ipcHandlers.ts` (or `updater.ts` for update channels), expose it in `electron/src/preload.ts`, and type it in `shared/types/electron.ts`.
10. API client. Add one method to the `api` object in `frontend/src/services/api.ts`. Use `request` for JSON and `openStream` for a stream. Only the files in `src/services/` talk to the backend.
11. Feature folder in `frontend/src/features/<feature>/`. Keep pure state logic in its own module (for example `downloads/singleDownloadState.ts`), hooks in `useX.ts` files, and components in `.tsx` files. Wire the feature into `AppShell.tsx` or the download page.

### Step 12: Remove duplication

If the new code repeats something that already exists (a stream helper, a status check, a download helper), move the shared part into `lib/` or a service. Do it only when the repetition really costs maintenance.

---

## Phase 5: Verify

### Step 13: Add tests

Tests mirror the source tree: `backend/tests/` for `backend/src/`, `frontend/tests/` for `frontend/src/`. Add tests in the same change for every new parser, mapper, validator, store, service rule and route. See `docs/workflows/TESTING.md` for the fixtures and examples.

### Step 14: Type check and run the tests

From the repository root:

```bash
npm run typecheck
npm test
```

Then lint the frontend:

```bash
cd frontend && npm run lint
```

### Step 15: Test the golden path by hand

Run `npm run dev` from the repository root and use the change in the Electron window, not only in a browser tab. IPC and Electron's own folder dialog only work inside Electron.

### Step 16: Test the edge cases

- A tool that is not installed yet (remove it from `backend/downloads/` and try again)
- A network failure in the middle of a download or install
- A link the app does not support
- A large batch (a long Instagram profile, a large channel)
- Closing the stream early (cancel the action in the UI) and checking that the work stops

### Step 17: Check every platform

If the change touches a manager or anything that runs a binary, check for a hardcoded `.exe`, a Windows-only asset URL, or a `win32`-only path. If macOS or Linux support is not part of this change, record the gap in `docs/philosophy/CROSS_PLATFORM.md`.

### Step 18: Check the console

Press F12 in the running app. Look for uncaught errors, failed requests and React warnings. The backend writes one JSON log line per request with its request id. Every JSON error carries the same `requestId`, so you can match a failed request to its log line.

### Step 19: Check the UI against the design reference

For any change you can see, compare the screen with `docs/design-reference.md`. Colours, radii, shadows and type come from the tokens in `frontend/src/styles/tokens.css`, with no hard-coded colour. Headers, rows, badges, notices and empty, loading and error states come from `frontend/src/components/patterns/`. Short-lived results are toasts, and destructive actions use `HoldToConfirmButton`. Check the light and dark themes, at 1440 px and at 960 px (the smallest window), and use the keyboard alone once.

---

## Phase 6: Document and commit

### Step 20: Update the docs

Use the Documentation Maintenance Policy table in `CLAUDE.md`. For example, a new route goes into `docs/architecture/backend/ROUTES.md` and the manual checklist in `docs/workflows/TESTING.md`. A new frontend feature goes into `docs/architecture/frontend/REACT_ARCHITECTURE.md`.

### Step 21: Update `CHANGELOG.md`

Add an entry under `[Unreleased]`.

### Step 22: Update `ROADMAP.md`

If the feature was on the roadmap, move it to done. If it opened follow-up work, add that.

### Step 23: Commit

Follow `docs/workflows/GIT.md`. Commit each self-contained change on its own.

### Step 24: Close the issue

Once the finishing commit (`Closes #<n>`) is on the working branch, close the issue with a comment that names the commit and the branch, says what changed, and says what was not verified. GitHub only closes it by itself when the commit reaches `main`.

To ship a set of closed issues, follow `docs/workflows/RELEASE.md`.
