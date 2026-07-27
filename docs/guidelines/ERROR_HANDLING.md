# Error Handling Standards

## Layer-by-Layer Rules

### Express Route Handlers (request/response)

Wrap the main logic in try/catch and respond with a JSON error body:

```js
router.post('/info', async (req, res) => {
    try {
        const parsed = parseYouTubeUrl(req.body.url);
        if (!parsed) return res.status(400).json({ error: 'Invalid or unsupported URL' });
        const info = await fetchInfoFromYtdlp(parsed);
        res.json(info);
    } catch (err) {
        console.error('POST /api/info:', err.message);
        res.status(500).json({ error: err.message });
    }
});
```

**Status codes:**
- `400` - bad request (invalid URL, missing required field, unsupported input)
- `404` - resource not found (e.g. account username not found for deletion)
- `500` - unexpected server error, tool crashed unexpectedly
- `503` - a required tool is not installed yet (matches the existing `yt-dlp.exe not found.` pattern in `download.js`)

### Express Route Handlers (SSE streaming)

Streaming routes never send an HTTP error status after the stream has started (SSE headers are already committed). Instead, emit a terminal `error` event and end the response:

```js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

send('phase', { phase: 'downloading', message: 'Downloading yt-dlp.exe...' });
// ...
proc.on('error', (err) => {
    send('error', { message: err.message });
    res.end();
});
proc.on('close', (code) => {
    if (code !== 0) { send('error', { message: `Process exited with code ${code}` }); return res.end(); }
    send('done', { filePath: outputPath });
    res.end();
});
```

If a failure is recoverable and the operation should continue (e.g. ffmpeg missing but the download can still proceed at a capped quality), emit a `warning` event instead of `error` - see the existing pattern in `backend/routes/download.js`.

### Tool Managers

Manager functions accept an `onEvent(event, data)` callback for anything that will run inside a stream (`ensureWhisper`, `setupToolsWithProgress`). On failure inside these functions:

1. Clean up any partial download (`fs.unlinkSync` the partial zip/exe in a try/catch)
2. Emit `onEvent('phase', { phase: 'error', message: '...' })`
3. Return `false` (do not throw) - the calling route decides whether that's a fatal SSE `error` or a non-fatal `warning`

For manager functions called outside a stream (`transcribeFile`, `checkYtdlpStatus`), throw a descriptive `Error` - the caller is a plain route handler with its own try/catch.

### Frontend

Fetch helpers throw on `!res.ok`, using the backend's `{ error: '...' }` body as the message:

```js
async function fetchInfo(url) {
    const res = await fetch('/api/info', { method: 'POST', ... });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch info');
    return data;
}
```

Components catch this and surface it through the existing alert/banner UI (`YtdlpAlert.jsx`) or local error state - never an unhandled rejection or a raw `alert()`.

SSE consumers (`ProgressModal.jsx`) branch on the parsed event name: `phase` updates a status line, `progress` updates a percentage/speed readout, `warning` shows a non-blocking inline note, `error` stops the operation and shows a retry affordance, `done` shows success and any follow-up action (e.g. "Transcribe this file"). `/api/download` also has a `paused` event, sent when the client explicitly pauses a single-video download (`POST /api/download/:id/pause`) - like `done`, it ends the SSE stream, but `ProgressModal.jsx` shows a Resume affordance instead of a success/failure message (see `DECISIONS.md` ADR-020).

## Logging

Use `console.error('METHOD /path:', err.message)` in route handlers - format matches the route for easy filtering in `backend.log` (see `docs/architecture/electron/MAIN_PROCESS.md` for where that log lives in a packaged build).

Do not log sensitive values: Instagram session cookie contents, file system paths outside the app's own data root that might reveal the user's directory structure unnecessarily, or full stack traces in code paths that reach the renderer.

Avoid new emoji-decorated `console.log` lines (see `docs/WRITING_STANDARDS.md`) - the existing startup banner in `server.js` predates this rule and is not a template for new code.

## User-Facing Error Messages

Backend errors should be descriptive but not expose internals:
- Good: `'yt-dlp.exe not found.'`, `'ffmpeg not found. Please ensure ffmpeg is installed via the setup screen.'`, `'Model "large" is not downloaded yet.'`
- Bad: `'ENOENT: no such file or directory, open C:\\Users\\...\\AppData\\...\\downloads\\yt-dlp.exe'`

When a Node/OS error (`ENOENT`, `EACCES`, subprocess exit code) is the root cause, translate it into a sentence that tells the user what to do next, matching the existing tone in `ytdlpManager.js` and `whisperManager.js`.
