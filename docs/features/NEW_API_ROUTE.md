# Guide: Adding a New API Route

Follow this guide when adding a route to the Express backend. Read an existing route file first - `backend/routes/info.js` for a plain request/response route, `backend/routes/download.js` for an SSE streaming route.

## Files to Create or Modify

| Action | File |
|---|---|
| Modify (or create, for a new feature area) | `backend/routes/myFeature.js` |
| Modify (if the route needs new tool orchestration) | `backend/utils/myManager.js` |
| Modify | `backend/server.js` (mount the router, only if it's a new file) |
| Modify | Frontend call site in the component that uses it |
| Update | `docs/architecture/backend/ROUTES.md` |

## Step 1: Add or Extend a Manager (if the route touches an external tool)

Business logic that shells out to a binary or does filesystem work belongs in `backend/utils/`, not inline in the route. See `docs/architecture/backend/MANAGERS.md` for the shared contract.

## Step 2a: Plain Request/Response Route

```js
// backend/routes/myFeature.js
const express = require('express');
const router = express.Router();
const { doTheThing } = require('../utils/myManager');

router.post('/my-resource', express.json(), async (req, res) => {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Missing required field: input' });
    try {
        const result = await doTheThing(input);
        res.json(result);
    } catch (err) {
        console.error('POST /api/my-resource:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
```

## Step 2b: SSE Streaming Route

```js
router.get('/my-resource/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    doTheThingWithProgress((event, data) => send(event, data))
        .then((result) => { send('done', result); res.end(); })
        .catch((err) => { send('error', { message: err.message }); res.end(); });

    req.on('close', () => { /* clean up any running subprocess if the client disconnects */ });
});
```

Follow the `phase`/`progress`/`done`/`error` shape documented in `docs/guidelines/ERROR_HANDLING.md` exactly - the frontend's `ProgressModal.jsx` depends on it.

## Step 3: Mount in `server.js` (new router files only)

```js
const myFeatureRoutes = require('./routes/myFeature');
app.use('/api', myFeatureRoutes);
```

Existing route files are already mounted; if you're adding to `download.js`, `info.js`, `setup.js`, `instagram.js`, or `transcribe.js`, skip this step.

## Step 4: Add the Frontend Call Site

Request/response:
```js
async function fetchMyResource(input) {
    const res = await fetch('/api/my-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}
```

SSE: reuse the stream-parsing pattern already in `App.jsx`/`ProgressModal.jsx` rather than writing a new `EventSource` handler from scratch.

## Step 5: Update Documentation

Add the route to `docs/architecture/backend/ROUTES.md`.

## Checklist

- [ ] Input validation returns `400` for missing/invalid required fields
- [ ] Tool-not-installed cases return `503` (request/response) or an `error` event (SSE) with an actionable message
- [ ] Errors are caught and logged with `console.error('METHOD /path:', err.message)`
- [ ] No hardcoded Windows-only path or `.exe` suffix introduced without checking `docs/philosophy/CROSS_PLATFORM.md`
- [ ] Manual test: run `npm run dev`, exercise the route from the real UI, check DevTools console for errors

## Testing

```bash
cd backend && node --watch server.js
curl -X POST http://localhost:3001/api/my-resource -H "Content-Type: application/json" -d "{\"input\":\"test\"}"
```
