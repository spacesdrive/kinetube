# Electron Main Process

## Files

| File | Responsibility |
|---|---|
| `electron/main.js` | Window lifecycle, backend process management, auto-updater, IPC handlers, single-instance lock |
| `electron/preload.js` | Context-isolated bridge exposing `window.electronAPI` to the renderer |
| `electron/loading.html` | Static splash screen shown while the packaged backend boots |

## Window Creation

`createWindow()` builds a single `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`. The renderer gets no Node.js access except what `preload.js` explicitly exposes on `window.electronAPI`. Do not weaken this without a specific, reviewed reason - it is the app's only real security boundary given how much of the app talks to the open internet (YouTube, Instagram, GitHub releases, Hugging Face).

- `ready-to-show` is used to avoid a blank white flash before first paint.
- `setWindowOpenHandler` redirects any `target="_blank"` link to the system browser via `shell.openExternal` instead of opening a second Electron window.
- F12 toggles DevTools in every build (dev and packaged) - this is intentional, to make support/debugging possible without a dev environment.

## Backend Process Management

| Mode | How the backend starts | How readiness is detected |
|---|---|---|
| Dev (`npm run dev`) | `concurrently` runs `node --watch backend/server.js` directly; Electron does not spawn it | `wait-on` blocks the `electron` command until `:3001` and `:5173` both respond |
| Packaged | `startBackend()` calls `utilityProcess.fork(getServerPath(), [], { env, stdio: 'pipe' })` after `app.whenReady()` | `waitForServer()` polls `GET http://localhost:3001/health` every 500ms, up to 40 attempts (~20s), before navigating the window |

`utilityProcess.fork` (not `child_process.fork`) is used so the backend runs inside Electron's own bundled Node.js runtime - the packaged app does not need a separate Node.js installation on the user's machine.

**Dev Electron launch:** `npm run dev`'s Electron step runs `node scripts/run-electron.js` rather than invoking the `electron` binary directly. The wrapper resolves the real Electron binary via `require('electron')` and strips `ELECTRON_RUN_AS_NODE` from the child's environment before spawning it - that variable is commonly leaked into a dev shell by an Electron-based host terminal (VS Code, Cursor, etc.) and, if inherited, makes the spawned Electron process behave as plain Node.js instead of launching the actual runtime, crashing at the `electron-updater` require with `app` undefined before any window opens. See `DECISIONS.md` ADR-018. This only affects `npm run dev` - `dist:*` scripts invoke `electron-builder`, not `electron`, and the packaged, installed app is launched by the OS, not this wrapper.

Environment variables injected into the backend process:

| Variable | Purpose |
|---|---|
| `PORT` | Always `3001` |
| `ELECTRON_APP` | Set to `'1'`; tells `backend/server.js` to relax CORS and serve the static frontend build |
| `ELECTRON_USER_DATA` | `app.getPath('userData')`; the writable data root - see `backend/utils/paths.js` |
| `ELECTRON_FRONTEND_DIST` | Absolute path to the packaged `frontend/dist` folder |

If the backend fails to become healthy within the timeout, `main.js` reads `backend.log` (written by `openLog()`/`writeLog()` in `app.getPath('userData')`) and renders it inline as a data URL error page rather than showing a blank window - this is the only diagnostic surface a non-technical user has if the app cannot start.

## Auto-Updater

`setupAutoUpdater()` wires `electron-updater`'s `autoUpdater` to the `update-status` IPC channel, consumed by `frontend/src/components/UpdateDialog.jsx` via `window.electronAPI.onUpdateStatus()`.

- Skipped entirely in dev (`isDev` check) - `app-update.yml` only exists in a packaged build.
- `autoDownload = false` and `autoInstallOnAppQuit = false` - the user must explicitly click "Update Now" in the dialog; downloads and installs never happen silently.
- The first update check is delayed 5 seconds after app ready, so the main window has time to paint before any network activity starts.
- IPC handlers `download-update` and `install-update` are invoked from the renderer through `window.electronAPI.downloadUpdate()` / `installUpdate()`.
- `check-for-updates` lets the renderer trigger an additional check on demand (used by the "Check for Updates" button in Settings - see `DECISIONS.md` ADR-019). It short-circuits with `{ devMode: true }` in dev rather than calling `autoUpdater.checkForUpdates()`, since that throws without a packaged build's `app-update.yml`.

## IPC Surface

The entire main-process-to-renderer API is defined in `preload.js`:

| Channel | Direction | Purpose |
|---|---|---|
| `open-folder-dialog` | renderer -> main (invoke) | Opens `dialog.showOpenDialog` scoped to directories; used by the download-folder picker in Settings |
| `get-app-version` | renderer -> main (invoke) | Returns `app.getVersion()`; shown in Settings' About card |
| `update-status` | main -> renderer (event) | Pushes updater state (`checking`, `available`, `not-available`, `progress`, `downloaded`, `error`) |
| `download-update` / `install-update` | renderer -> main (invoke) | Triggers `autoUpdater.downloadUpdate()` / `quitAndInstall()` |
| `check-for-updates` | renderer -> main (invoke) | Triggers `autoUpdater.checkForUpdates()` on demand; resolves `{ devMode: true }` instead in dev |

Adding a new IPC channel: expose it in `preload.js` under `electronAPI`, register the handler in `main.js` with `ipcMain.handle` (request/response) or `mainWindow.webContents.send` (event push), and document it in this table.

## Shutdown and Single Instance

- `app.requestSingleInstanceLock()` ensures only one KineTube window can run; a second launch focuses the existing window instead of opening a new one.
- `before-quit` and `window-all-closed` both call `serverProcess?.kill()` so the Express child process never survives the Electron process on any platform.
- On macOS, `window-all-closed` does not call `app.quit()` (matches platform convention - closing the window does not quit the app on macOS). This is currently the only `process.platform` branch in the entire codebase; see `docs/philosophy/CROSS_PLATFORM.md` for why the tool managers have none.
