# Backend - Express Application Structure

## Entry Point: `backend/server.js`

A single Express app, started directly with `node server.js` (or `utilityProcess.fork` from Electron in a packaged build - see `docs/architecture/electron/MAIN_PROCESS.md`).

```js
const app = express();
app.use(cors({ origin: ... }));
app.use(express.json());

app.use('/api', infoRoutes);
app.use('/api', downloadRoutes);
app.use('/api', setupRoutes);
app.use('/api', instagramRoutes);
app.use('/api', transcribeRoutes);

app.get('/api/proxy/img', ...);   // inline, not a separate router - see below
app.get('/health', ...);

if (process.env.ELECTRON_APP && process.env.ELECTRON_FRONTEND_DIST) {
    app.use(express.static(dist));
    app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
}
```

All five route files are mounted under `/api` with no further prefix - route paths are fully qualified in the router file itself (for example `router.get('/transcribe/setup', ...)` becomes `GET /api/transcribe/setup`).

## Module Export for Testability

`server.js` exports the configured `app` (`module.exports = app;`) immediately after all routes and middleware are registered, and only calls `startServer()` (which binds the port and runs binary setup checks) when the file is the process entry point:

```js
if (require.main === module) {
    startServer().catch((err) => { console.error('Fatal startup error:', err); process.exit(1); });
}
```

`require.main === module` is true for both ways this file is actually launched - `node server.js` in dev, and Electron's `utilityProcess.fork(getServerPath())` in a packaged build - so this changes nothing about runtime behavior. It is false when a test file does `require('../server')`, which is exactly what `backend/test/routes.test.js` relies on to drive the app with `supertest` without binding a real port or triggering yt-dlp/ffmpeg setup checks. See `docs/workflows/TESTING.md`.

## CORS

```js
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', `http://localhost:${PORT}`];
app.use(cors({
    origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin) || !!process.env.ELECTRON_APP),
}));
```

In a packaged build every request originates from the same Electron renderer, so `ELECTRON_APP=1` short-circuits the allow-list entirely. In standalone dev mode (backend run outside Electron, e.g. for testing with `curl` or the Vite dev server), only the two known Vite origins and the backend's own origin are allowed.

## Image Proxy

`GET /api/proxy/img?url=<encoded>` is defined inline in `server.js`, not as a router, because it needs direct access to `http`/`https` for streaming the response body. It exists to work around Instagram/YouTube CDN hotlink protection when rendering thumbnails in the renderer.

**Security constraint:** only hostnames ending in one of `IMG_PROXY_ALLOWED` (`cdninstagram.com`, `fbcdn.net`, `instagram.com`, `pinimg.com`, `yt3.ggpht.com`, `yt3.googleusercontent.com`, `ytimg.com`, `i.ytimg.com`) are fetched. A single redirect hop is followed and re-validated against the same allow-list before being followed. Widening this list requires the same SSRF review as adding it in the first place - do not accept a caller-supplied hostname without validating it against this list.

## Static Frontend Serving

The Express server is the *only* HTTP server in a packaged build - it serves both the JSON/SSE API and the built React app. This block is gated on both `ELECTRON_APP` and `ELECTRON_FRONTEND_DIST` being set, which only happens when Electron's `utilityProcess.fork` injected them (see `MAIN_PROCESS.md`). In dev, Vite serves the frontend on its own port and this block never runs.

## Startup Sequencing

```js
async function startServer() {
    await new Promise((resolve, reject) => {
        _server = app.listen(PORT, resolve);
        _server.on('error', (err) => { if (err.code === 'EADDRINUSE') process.exit(1); reject(err); });
    });
    // server is now accepting connections and /health responds

    ensureYtDlp().then(...);   // non-blocking
    ensureFfmpeg().then(...);  // non-blocking
}
```

**This ordering is load-bearing.** `electron/main.js`'s `waitForServer()` polls `/health` with a bounded retry count before navigating the window to the app. If `app.listen()` were preceded by any binary check or download, a slow or failing tool download would delay or break app startup entirely. Any new startup-time initialization must go *after* `app.listen()` resolves, and must not block the event loop.

## Writable Data Root

See `backend/utils/paths.js` and `docs/architecture/OVERVIEW.md` - Data Storage Strategy. The short version: never hardcode a path relative to `__dirname` for anything the app writes at runtime. Import `DOWNLOADS_DIR`, `MODELS_DIR`, or `SESSIONS_DIR` from `paths.js` instead, which resolves to `backend/` in dev and `app.getPath('userData')` in a packaged build.

## Environment Variables Read by the Backend

| Variable | Set by | Purpose |
|---|---|---|
| `PORT` | `server.js` default (`3001`), overridable | HTTP port |
| `ELECTRON_APP` | `electron/main.js` (packaged only) | Relaxes CORS, enables static frontend serving |
| `ELECTRON_FRONTEND_DIST` | `electron/main.js` (packaged only) | Path to `frontend/dist` |
| `ELECTRON_USER_DATA` | `electron/main.js` (packaged only) | Writable data root, read by `paths.js` |

## Error Handling

Express 5 is used, which auto-forwards rejected promises in async route handlers to Express's default error handler - but route handlers in this codebase still wrap their own logic in try/catch and respond explicitly (see `docs/guidelines/ERROR_HANDLING.md`), rather than relying on the default handler's generic 500 response. Do not remove those try/catch blocks on the assumption that Express 5 "handles it now" - the explicit handling produces a useful `{ error: '...' }` body; the default handler does not.
