# Backend Routes

All routes are mounted under `/api` (plus the top-level `/health` and the inline `/api/proxy/img` documented in `EXPRESS.md`). None of them require authentication - the app has no accounts or auth model; every request is trusted because it originates from the app's own renderer or, in dev, a known localhost origin.

## Info (`backend/routes/info.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ytdlp-status` | Returns yt-dlp/ffmpeg installed state and version, from `ytdlpManager.checkYtdlpStatus()` |
| POST | `/api/info` | Runs `yt-dlp -J <url>` for a YouTube URL/channel and returns title, thumbnail, and available formats |
| GET | `/api/dialog/folder` | Server-side folder browse helper (distinct from the Electron IPC folder picker - used when the backend needs to enumerate a path outside the renderer's dialog flow) |
| GET | `/api/validate-path` | Checks that a given filesystem path exists and is writable before it is saved as the download folder setting |

## Download (`backend/routes/download.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/download` | SSE stream. Builds a yt-dlp format selector from query params, spawns yt-dlp with `--newline --progress`, and streams `phase`/`progress`/`done`/`paused`/`error` events. Emits a `warning` event (not fatal) if ffmpeg is missing and the requested quality needs merging. Records the request in `pendingDownloads.js` on start and clears it on any in-process end (done, spawn error, or client cancel) - but NOT when paused via the route below. See `docs/architecture/backend/MANAGERS.md` - "Resuming an interrupted download". |
| POST | `/api/download/:id/pause` | Pauses the single-video download identified by the `id` the `start` SSE event carried. Kills the yt-dlp process (same as cancel) but keeps the pending-download record, so the download can be resumed later - see `DECISIONS.md` ADR-020. `404` if `id` isn't a currently-active download. |
| GET | `/api/download/pending` | Returns single-video downloads still recorded as in-flight - non-empty if the app was killed mid-download last time, or if one is currently paused. |
| DELETE | `/api/download/pending/:id` | Dismisses a resumable download without restarting it (the partial file, if any, is left on disk). |

## Setup (`backend/routes/setup.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/setup` | SSE stream that runs `ytdlpManager.setupToolsWithProgress()` - downloads yt-dlp and ffmpeg if missing |
| GET | `/api/setup/check` | Returns current install status for yt-dlp and ffmpeg without downloading anything |

## Transcribe (`backend/routes/transcribe.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/transcribe/setup/check` | Returns whether whisper.cpp is installed |
| GET | `/api/transcribe/setup` | SSE stream that downloads/extracts whisper.cpp via `whisperManager.ensureWhisper()` |
| GET | `/api/transcribe/models` | Lists the five whisper model sizes and which are already downloaded (`whisperManager.getAvailableModels()`) |
| GET | `/api/transcribe/model/ensure` | SSE stream that downloads one model from Hugging Face if not already present |
| POST | `/api/transcribe/file` | Transcribes an existing file already on disk by path (JSON body) |
| POST | `/api/transcribe/upload` | Transcribes a file uploaded via `multer` (used when the source isn't already in the downloads folder) |

## Instagram (`backend/routes/instagram.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/instagram/setup/python/check` | Whether Python and the `instaloader` pip package are ready (required for login/profile scripts) |
| GET | `/api/instagram/setup/instaloader` | SSE stream that runs `python -m pip install instaloader` - identical on all three platforms |
| GET | `/api/instagram/accounts` | Lists saved Instagram accounts (usernames only, never session content) |
| DELETE | `/api/instagram/accounts/:username` | Removes a saved account and deletes its session file |
| POST | `/api/instagram/login` | Starts an instaloader login flow (spawns `instaloader_login.py`); may pause for 2FA |
| POST | `/api/instagram/login/2fa` | Submits a 2FA code to the paused login process registered in `instaloaderManager`'s active-login map |
| POST | `/api/instagram/session/import` | Imports an externally-obtained instaloader session file |
| POST | `/api/instagram/info` | Fetches metadata for a single Instagram URL (post/reel/story/profile) |
| GET | `/api/instagram/info-stream` | SSE variant of `/instagram/info`, used for profile bulk-fetch where enumeration itself takes time |
| GET | `/api/instagram/download` | SSE stream for downloading a single Instagram post/reel/story |
| GET | `/api/instagram/bulk-download` | SSE stream for downloading an entire profile (up to 500 posts), spawns `instaloader_profile.py` |

## SSE Event Shape

Every streaming route (`/api/download`, `/api/setup`, `/api/transcribe/setup`, `/api/transcribe/model/ensure`, `/api/instagram/*-stream`, `/api/instagram/*download*`) emits the same four event kinds. See `docs/guidelines/ERROR_HANDLING.md` for the exact payload shape and how the frontend consumes it.

## Adding a New Route

See `docs/features/NEW_API_ROUTE.md`.
