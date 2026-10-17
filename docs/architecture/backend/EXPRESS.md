# Backend application structure

The backend is one Express 5 app written in strict TypeScript as ES modules (`"type": "module"` in `backend/package.json`). It serves the JSON and streaming API under `/api/v1`, the `/health` check, and, in the packaged app, the built frontend.

## How it starts

`backend/src/server.ts` is the entry point. It runs `start()`, which does four things in this order:

1. Creates the logger (`createLogger()` in `src/lib/logger.ts`).
2. Reads the config from the environment (`readConfig(process.env, backendRoot)` in `src/config.ts`).
3. Builds every manager and service once (`createContainer(config)` in `src/container.ts`).
4. Builds the Express app (`createApp()` in `src/app.ts`) and calls `app.listen(config.port, config.host)`.

It logs the yt-dlp and FFmpeg status (`logToolStatus()`) only after the server emits `listening`. **The listener must start before any tool check.** Electron's `waitForBackend()` polls `/health` up to 40 times, half a second apart, before it opens the window. A slow tool check or download at startup would delay or break the app. Any new startup work goes after `listening` and must not block.

If the port is taken (`EADDRINUSE`), the backend logs "Port 3001 is already in use. Close the other KineTube window and try again." and exits with code 1.

How the backend is launched:

| Mode | Command | What runs |
|---|---|---|
| Development | `npm run dev` (root) runs `node --watch src/server.ts` in `backend/` | the `.ts` files directly; Node 22.18 or newer strips the types |
| Packaged | Electron forks `resources/backend/dist/server.js` in a `utilityProcess` | the `tsc` output from `npm run build` (`tsc -b tsconfig.build.json`) |
| Local production check | `npm start` in `backend/` | `node dist/server.js` |

`backendRoot` is the folder that holds `backend/package.json`. Both `src/` and `dist/` sit one level inside it, so `server.ts` finds it with `path.resolve(import.meta.dirname, '..')` either way.

## The request pipeline

`createApp({ config, services, logger })` in `src/app.ts` builds the pipeline. The order matters: each step can answer early, and the error handler at the end formats anything thrown before it.

| Step | Code | Why it sits here |
|---|---|---|
| 1. Request id and access log | `requestContext(logger)` (`src/middleware/requestContext.ts`) | Every later step and every error can use `res.locals.requestId`. |
| 2. Origin guard | `originGuard(config.port)` (`src/middleware/originGuard.ts`) | Refuses other web pages and other host names before any work is done. |
| 3. `GET /health` | inline in `app.ts` | Answers `{ ok: true }` before the JSON parser and before any tool is checked. |
| 4. JSON body parser | `express.json({ limit: '1mb' })` | Every API route except the multipart upload reads JSON. |
| 5. API router | `app.use('/api/v1', createApiRouter(services, logger))` | All resources. See `ROUTES.md`. |
| 6. API 404 | `app.use('/api', apiNotFound)` | Any other `/api` path gets a JSON 404, never the frontend's `index.html`. |
| 7. Static frontend | `express.static(frontendDist)` plus an `index.html` fallback | Only when `config.frontendDist` is set (packaged app). |
| 8. Error handler | `errorHandler(logger)` (`src/middleware/errorHandler.ts`) | One error shape for the whole API. |

The app also calls `app.disable('x-powered-by')`.

`createApp()` takes its dependencies as arguments and does not listen. The route tests in `backend/tests/routes/apiRoutes.test.ts` build it with fake managers and drive it with `supertest`, so no port is bound and no real tool runs.

## Config and environment variables

`readConfig(env, backendRoot)` turns the environment into an `AppConfig`. Nothing else reads `process.env` for these values.

| Variable | Set by | Effect |
|---|---|---|
| `PORT` | `electron/src/backendProcess.ts` sets `3001`; defaults to `3001` | The HTTP port. It must be a whole number from 1 to 65535, or startup throws. |
| `ELECTRON_APP` | `electron/src/backendProcess.ts` (`'1'`) | Marks the packaged app. `frontendDist` is only set when this is set. |
| `ELECTRON_USER_DATA` | `electron/src/backendProcess.ts` (`app.getPath('userData')`) | The writable data folder. Without it, the backend folder itself is used. |
| `ELECTRON_FRONTEND_DIST` | `electron/src/backendProcess.ts` (`resources/frontend/dist`) | The built frontend the backend serves. Ignored unless `ELECTRON_APP` is set. |

The resulting `AppConfig` fields:

| Field | Value |
|---|---|
| `port` | from `PORT`, default `3001` |
| `host` | always `127.0.0.1` |
| `isElectron` | `Boolean(ELECTRON_APP)` |
| `dataDir` | `ELECTRON_USER_DATA`, or `backendRoot` |
| `frontendDist` | `ELECTRON_FRONTEND_DIST` when `ELECTRON_APP` is set, else `null` |
| `pythonDir` | `backendRoot/python`, where the instaloader helper scripts live |

## Writable data folder

`createAppPaths(dataDir)` in `src/lib/paths.ts` is the only place that builds a writable path. `ensureAppDirs()` creates the folders at startup.

| Path | Holds |
|---|---|
| `downloads/` | Tool binaries (yt-dlp, FFmpeg, whisper.cpp) and the default download folder |
| `models/` | whisper.cpp model files |
| `sessions/` | Instagram session files (`session-<username>`) and `accounts.json` |
| `pending-downloads.json` | Single downloads that started and have not finished |

In development `dataDir` is `backend/`. In the packaged app it is Electron's `userData` folder. Never build a writable path from `import.meta.dirname` or another code location: in the packaged app the code folder may not be writable.

## The composition root

`src/container.ts` builds everything once at startup.

- `createContainer(config)` creates the paths, then the four managers (`createYtdlpManager`, `createFfmpegManager`, `createWhisperManager`, `createInstaloaderManager` with `createPythonDetector`), then calls `createServices(managers, paths)`.
- `createServices(managers, paths)` creates the two stores and the ten services and returns them as `Services`. The route tests call it directly with fake managers.

Running downloads, pending Instagram logins, install locks and model download locks live inside these service objects for the life of the process. That is why the services are built once and passed down, never created per request.

## Layers

A request moves down through these layers. Each one has a single job and a list of things it must not do.

| Layer | Folder | Job | Must not |
|---|---|---|---|
| Routes | `src/routes/` | One route table per resource. `apiRouter.ts` mounts them. | hold logic, read input, or call services |
| Validators | `src/validators/` | Turn untrusted `req.body`, `req.query` and `req.params` into typed input. Throw `ValidationError` or `NotFoundError`. | touch the disk, spawn processes, or call services |
| Controllers | `src/controllers/` | Validate input, call one service method, send JSON or a stream (`sendStream()` in `controllers/http.ts`). | catch errors, hold business rules, or touch managers |
| Services | `src/services/` | Business rules: tools, YouTube and Instagram media, Instagram accounts, downloads, download batches, whisper models, transcriptions, folders, the image proxy. | read `req` or `res`, or spawn tool binaries themselves |
| Stores | `src/stores/` | JSON file stores for pending downloads and Instagram accounts, written atomically (`writeJsonAtomic()`). | know about HTTP or streams |
| Managers | `src/managers/` | One folder per external tool (`ytdlp/`, `ffmpeg/`, `whisper/`, `instaloader/`): download, install, locate and spawn. | know about HTTP, or send a stream's `done` event |
| Platforms | `src/platforms/` | Pure URL parsers and yt-dlp JSON mappers for YouTube and Instagram. | do any I/O |
| Lib | `src/lib/` | Shared helpers: `errors`, `logger`, `sse`, `runProcess`, `processTree`, `httpDownload`, `archives`, `paths`, `keyedLock`, `versions` and others. | depend on services or managers |
| Middleware | `src/middleware/` | `requestContext`, `originGuard`, `acceptUpload` (multer), `errorHandler`. | hold business rules |

**Only managers spawn tool binaries.** Services call manager methods such as `ytdlp.startDownload()` or `instaloader.startHelper()`. The one exception is `folderService.pick()`, which runs `powershell` through `runProcess()` to show the Windows folder dialog; PowerShell is part of Windows, not a managed tool.

A service that streams returns a `StreamJob` (`src/services/streamJob.ts`): a function `(send, signal) => Promise<void>`. The service runs its checks and throws before it returns the job, so a bad request becomes a normal JSON error before any stream opens. See `ROUTES.md` for the stream contract.

## Static frontend in the packaged app

The packaged app has no Vite server. The backend is the only HTTP server: it serves the API and the built React app from `ELECTRON_FRONTEND_DIST`. After `express.static`, every other non-API path gets `index.html`, so client-side routes load. In development, Vite serves the frontend on port 5173 and proxies `/api` to `127.0.0.1:3001`, and this step never runs.

The Electron window loads `http://localhost:3001`, the same origin as 1.x, so settings saved in `localStorage` (key `kinetube_settings`) survive the upgrade.

## Logging

`createLogger()` writes one JSON object per line to stdout:

```json
{"level":"info","time":"2026-10-17T09:00:00.000Z","message":"Request handled","requestId":"...","method":"POST","path":"/api/v1/downloads","status":200,"durationMs":5321}
```

- Levels are `info`, `warn` and `error`. Extra fields are added beside `message`. An `Error` value is logged as its `name`, `message` and `stack`.
- `requestContext` logs one "Request handled" line when each response finishes. It leaves out the query string, because it can hold file paths and links. It skips `/health`, which Electron polls on every start.
- The error handler logs "Unexpected error" for anything that is not a typed `AppError`. `sendStream()` logs "A stream failed" when a stream job throws.
- In the packaged app, Electron pipes the backend's stdout into `backend.log` in the `userData` folder, with each chunk prefixed `[backend] ` (stderr gets `[backend:err] `). The file is rewritten on every start. In development the lines appear in the terminal running `npm run dev`.

Never log an Instagram password, session file contents, or a request's query string. `instagramAccountService` sends the password to the login helper over stdin only.

## Security model

The API has no accounts or tokens. It is protected by where it listens and by who may call it. See `DECISIONS.md` ADR-026.

- Loopback only: The server listens on `127.0.0.1`, so other machines on the network cannot reach it.
- Host check: `originGuard` answers 403 `FORBIDDEN` unless the `Host` header is `localhost:<port>` or `127.0.0.1:<port>`. This stops DNS rebinding, where a web page points its own domain at 127.0.0.1. The guard runs before `/health`, so Electron's health check sends `Host: localhost:3001`.
- Origin check: When an `Origin` header is present, it must be `http://localhost:<port>`, `http://127.0.0.1:<port>`, `http://localhost:5173` or `http://127.0.0.1:5173` (the Vite dev server). Anything else gets 403. No CORS headers are ever sent; the `cors` package was removed.
- Links are parsed, never passed through: Every link goes through the platform URL parsers in `src/platforms/`. Only single YouTube videos and Shorts, and Instagram posts, reels and stories, can be downloaded. `buildDownloadArgs()` and `buildMetadataArgs()` put the link after `--`, so a value that starts with `-` can never be read as a yt-dlp option.
- Usernames are validated: `isInstagramUsername()` accepts 1 to 30 letters, digits, `.` and `_` (and rejects `.` and `..`), so a username can never reach outside the sessions folder.
- The image proxy is allow-listed: `GET /api/v1/images` only fetches `https` URLs whose host equals, or is a real subdomain of, an entry in `IMAGE_PROXY_ALLOWED_HOSTS` (`src/services/imageProxyService.ts`). Each redirect, up to 3, is checked again, and the answer must have an `image/*` content type. Never widen the list without an SSRF review.
- Session files stay private: Only `instagramAccountStore` and the Python helpers touch `sessions/`. No route returns a session file. The packaging filter in the root `package.json` leaves out `sessions/**`, `src/**`, `tests/**`, `.env`, `pending-downloads.json` and `models/**`.
- Instagram sessions are not passed to yt-dlp: instaloader saves a session as a Python pickle, which yt-dlp cannot read as a cookie file. Post lookups and downloads run logged out; profiles use the saved session through instaloader. See ADR-030.
- Request size limits: JSON bodies are capped at 1 MB. Uploads for transcription are capped at 2 GB, one file, with an audio or video extension (`src/middleware/acceptUpload.ts`).

## Error handling

Controllers never catch. Express 5 forwards a rejected promise from an async handler to the error handler, which turns a typed `AppError` into `{ success: false, code, message, requestId }` with the right status. Anything else becomes a 500 `INTERNAL` with a fixed message and is logged. See `docs/guidelines/ERROR_HANDLING.md`.
