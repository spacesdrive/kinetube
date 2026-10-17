# Electron main process

## Files

The main process is written in TypeScript in `electron/src/` and compiled to `electron/dist/`.

| File | What it does |
|---|---|
| `main.ts` | The entry point. Removes the native menu, registers the IPC handlers, takes the single-instance lock, creates the window, sets up the updater, starts the backend in a packaged build, and stops it on quit. |
| `appPaths.ts` | `isDev` (`!app.isPackaged`), `BACKEND_PORT` (3001), `APP_URL` (`http://localhost:3001`), `DEV_SERVER_URL` (`http://localhost:5173`), and the paths to the preload script, loading page, icon, backend entry, frontend build and `backend.log`. |
| `backendProcess.ts` | `startBackend` forks the backend in a utility process. `waitForBackend` polls `/health`. |
| `backendLog.ts` | Opens, writes and reads `backend.log`. |
| `mainWindow.ts` | `createMainWindow` builds the `BrowserWindow`. |
| `ipcHandlers.ts` | The `open-folder-dialog` and `get-app-version` handlers. |
| `updater.ts` | `setUpAutoUpdater`: the three update handlers and the `update-status` events. |
| `errorPages.ts` | The two error pages, built as `data:` URLs with the text HTML-escaped. |
| `preload.ts` | Exposes `window.electronAPI` to the page through `contextBridge`. |

`electron/loading.html` is a static page. It is not compiled, and the window shows it while the packaged backend starts.

## Why it compiles to CommonJS

Electron 33 runs on its own Node 20, which cannot run `.ts` files (ADR-029). So `npm run build:electron` (`tsc -b electron`) compiles `electron/src/` to `electron/dist/`, and the root `package.json` points `main` at `electron/dist/main.js`.

`electron/tsconfig.json` uses `"module": "nodenext"`. The root `package.json` has no `"type": "module"`, so `tsc` writes CommonJS. `appPaths.ts` relies on that: it uses `__dirname` to find `preload.js` next to it and the project root two folders up.

`preload.ts` and `updater.ts` import `shared/types/electron.ts` by relative path with `import type`, so the compiled files have no import of it. `npm run dev` runs `build:electron` before it starts anything, so a change in `electron/src/` needs a restart of `npm run dev`.

The packaged app includes `electron/dist/**/*` and `electron/loading.html` (`build.files` in `package.json`).

## Window lifecycle

`createMainWindow` builds one window: 1280 by 800, at least 960 by 640, titled KineTube, with `build/icon.png`.

- `webPreferences` sets `contextIsolation: true`, `nodeIntegration: false` and the compiled preload script. The page has no Node access. Do not change this without a reviewed reason: the app loads data from YouTube, Instagram, GitHub and Hugging Face.
- The window starts hidden and shows on `ready-to-show`, so there is no white flash.
- `setWindowOpenHandler` opens any new-window link in the system browser with `shell.openExternal` and denies the Electron window.
- F12 toggles the developer tools in every build. This is on purpose, so a problem can be looked at without a development setup.
- `Menu.setApplicationMenu(null)` removes the native File, Edit and View menu, because the app has its own sidebar.

What the window loads depends on the build:

| Build | First page | Then |
|---|---|---|
| Development | `http://localhost:5173` (Vite) | Nothing more. The `npm run dev` script runs the backend. |
| Packaged | `electron/loading.html` | `loadPackagedApp` starts the backend if it is not running, waits for `/health`, and loads `http://localhost:3001`. |

If the page at `http://localhost:3001` fails to load, a one-time `did-fail-load` handler writes the error to `backend.log` and shows `loadFailurePage` with the error code and description.

## Backend start and health check

In development, Electron does not start the backend. `npm run dev` runs `node --watch src/server.ts` in `backend/` and starts Electron only after `wait-on` sees `http://127.0.0.1:3001/health` and `http://localhost:5173`. It starts Electron through `scripts/run-electron.mts`, which removes `ELECTRON_RUN_AS_NODE` from the environment (ADR-018). Editor terminals often set that variable, and with it Electron runs as plain Node and crashes when it loads `electron-updater`.

In a packaged build, `startBackend` calls `utilityProcess.fork` on `resources/backend/dist/server.js` with `stdio: 'pipe'`. A utility process runs on Electron's own Node, so the person needs no Node install (ADR-002). It sets these variables:

| Variable | Value | Used for |
|---|---|---|
| `PORT` | `3001` | The port the backend listens on. |
| `ELECTRON_APP` | `1` | Tells `readConfig` that it runs inside Electron. |
| `ELECTRON_USER_DATA` | `app.getPath('userData')` | The writable data folder. |
| `ELECTRON_FRONTEND_DIST` | `resources/frontend/dist` | The built frontend that the backend serves. |

`waitForBackend` sends `GET http://127.0.0.1:3001/health` up to 40 times, 500 ms apart (about 20 seconds). The request names `127.0.0.1` because the backend listens there only. It sets `Host: localhost:3001`, which the origin guard accepts. Any status below 500 counts as healthy.

If `/health` never answers, `main.ts` writes a line to the log and loads `backendFailurePage`. That page shows the path of `backend.log` and its contents, so the person can report the problem.

## backend.log

`backend.log` sits in `app.getPath('userData')`. `openBackendLog` opens it with the `w` flag when the packaged backend starts, so it always holds the latest run only. In development it is never opened, and lines only go to the terminal.

`writeLog` writes each line to the file and to the main process's stdout. The lines have these prefixes:

| Prefix | Source |
|---|---|
| `[main]` | The main process: the backend entry path, a failed health check, a failed page load. |
| `[backend]` | Backend stdout. The backend logs one JSON object per line (`backend/src/lib/logger.ts`). |
| `[backend:err]` | Backend stderr. |
| `[updater]`, `[updater:warn]`, `[updater:err]` | `electron-updater`'s logger and update errors. |

## Single instance and shutdown

- `app.requestSingleInstanceLock()` runs before the app is ready. A second launch quits at once. The first instance gets `second-instance`, restores its window if it is minimized, and focuses it.
- `before-quit` kills the backend process, so it never outlives Electron.
- On macOS, `window-all-closed` does not quit the app, which matches the platform, and the backend keeps running. On other platforms it quits.
- `activate` (macOS) opens a new window through the same `openWindow()` as the first one. In a packaged build it finds the backend still running and loads the app; if the backend has exited, it starts a new one.

## Updater

`setUpAutoUpdater` in `updater.ts` uses `electron-updater`'s `autoUpdater` with the GitHub provider from `build.publish` in `package.json`.

- Nothing downloads or installs without the person's click: `autoDownload` and `autoInstallOnAppQuit` are both `false`.
- A first check runs 5 seconds after the window is created, so it never slows the start.
- `check-for-updates`, `download-update` and `install-update` are registered in every build. In development, `check-for-updates` answers `{ isDevMode: true }` without calling the updater, because `app-update.yml` exists only in a packaged build. The updater events and the first check are set up in packaged builds only.
- `download-update` calls `autoUpdater.downloadUpdate()`. `install-update` calls `autoUpdater.quitAndInstall(false, true)`: on Windows the installer is not silent, and KineTube starts again when it finishes.
- Every updater event is sent to the window on the `update-status` channel.

In the renderer, `useUpdateNotice` (`frontend/src/hooks/`) opens `UpdateDialog` when an `available` status arrives. `UpdateDialog` follows the download progress and offers to install. `useAppUpdateCheck` (`frontend/src/features/settings/`) runs the manual check on the About card in Settings (ADR-019).

## IPC channels

The whole bridge is `ElectronApi` in `shared/types/electron.ts`. `preload.ts` implements it and exposes it as `window.electronAPI`.

| Channel | Direction | Renderer method | Result or payload |
|---|---|---|---|
| `open-folder-dialog` | Renderer to main (`invoke`) | `openFolderDialog()` | `string \| null`: the picked folder, or `null` if cancelled. |
| `get-app-version` | Renderer to main (`invoke`) | `getAppVersion()` | `string` from `app.getVersion()`. |
| `check-for-updates` | Renderer to main (`invoke`) | `checkForUpdates()` | `UpdateCheckResult`: `{ isDevMode: boolean }`. |
| `download-update` | Renderer to main (`invoke`) | `downloadUpdate()` | `void` |
| `install-update` | Renderer to main (`invoke`) | `installUpdate()` | `void` |
| `update-status` | Main to renderer (`send`) | `onUpdateStatus(callback)` | `UpdateStatus` (below). `onUpdateStatus` returns a function that removes the listener. |

`UpdateStatus` is a union on `type`:

| `type` | Extra fields | Sent when |
|---|---|---|
| `checking` | none | A check starts. |
| `available` | `version` | A newer release exists. |
| `not-available` | none | The installed version is the newest. |
| `progress` | `percent`, `bytesPerSecond`, `transferredBytes`, `totalBytes` | The update is downloading. |
| `downloaded` | none | The update is ready to install. |
| `error` | `message` | The updater failed. The message starts with "The update couldn't be downloaded:". |

`window.electronAPI` does not exist when the frontend runs in a plain browser. Every caller checks it first, for example `window.electronAPI?.onUpdateStatus(...)`. `frontend/src/lib/folderPicker.ts` falls back to `POST /api/v1/folders/pick` when it is missing.

### Adding a channel

1. Add the method to `ElectronApi` in `shared/types/electron.ts`.
2. Implement it in `electron/src/preload.ts` with `ipcRenderer.invoke` or `ipcRenderer.on`.
3. Register the handler with `ipcMain.handle` in `ipcHandlers.ts`, or in `updater.ts` for update work.
4. Add it to the table above.
