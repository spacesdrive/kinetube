# Backend routes

Every API route sits under `/api/v1`. `/health` stays at the root because Electron and the `npm run dev` script wait on it. `src/routes/apiRouter.ts` mounts one route table per resource. The request and response types live in `shared/types/` and are the contract for both sides. `docs/api/openapi.yaml` describes the same API as an OpenAPI 3.1 document.

No route needs a login or a token. The origin guard decides who may call the API (see `EXPRESS.md`, "Security model"). Any request that fails it gets 403 `FORBIDDEN`, so 403 is left out of the tables below.

## Response envelope

JSON responses use one of three shapes from `shared/types/api.ts`:

| Shape | Type | Used for |
|---|---|---|
| `{ data }` | `DataResponse<T>` | one item |
| `{ data, total }` | `ListResponse<T>` | a list; `total` is the number of items in `data` |
| `{ success: false, code, message, requestId }` | `ErrorResponse` | every error |

Error codes and their HTTP status:

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | The input is missing, malformed or not allowed |
| `FORBIDDEN` | 403 | The origin guard refused the request, or the image host is not allowed |
| `NOT_FOUND` | 404 | The resource, or the route, does not exist |
| `CONFLICT` | 409 | The same work is already running, or a precondition is not met |
| `INTERNAL` | 500 | An unexpected error; the message is fixed and the details go to the log |
| `NOT_SUPPORTED` | 501 | The feature does not work on this platform |
| `UPSTREAM_FAILED` | 502 | YouTube, Instagram, GitHub or a tool answered with a failure |
| `TOOL_NOT_INSTALLED` | 503 | A tool the route needs is not installed yet |
| `UPSTREAM_TIMEOUT` | 504 | YouTube or Instagram took too long to answer |
| `CANCELLED` | none | Only in a stream's `done` event, when the work was cancelled |

`requestId` matches the `requestId` field of the access log line for the same request, so a message the person saw can be found in `backend.log`.

Two errors apply to every route that reads a body: a body that is not valid JSON, and a JSON body over 1 MB, are both 400 `VALIDATION_FAILED`. Any `/api` path that no route matches is 404 `NOT_FOUND`.

## Stream contract

Long work answers with a stream of server-sent events (SSE, a long-lived HTTP response that sends named events as text). The frontend reads it with `fetch` (`frontend/src/services/eventStream.ts`), so a stream can be a POST with a JSON body. See `DECISIONS.md` ADR-005 and ADR-025.

- The response has status 200 and `Content-Type: text/event-stream`. Each event is written as `event: <name>` and `data: <JSON>` followed by a blank line.
- Event names and payloads are typed per route in `shared/types/` (`ToolInstallEvents`, `DownloadEvents`, `DownloadBatchEvents`, `ModelDownloadEvents`, `TranscriptionEvents`, `InstagramMediaEvents`).
- The last event is always `done`, typed `StreamDone<T>`: either `{ success: true, message, ...result }` or `{ success: false, code, message }`. If the job throws after the stream opened, `sendStream()` sends a failed `done` with the error's code, or `INTERNAL` for an unexpected error.
- A `: keepalive` comment line is written every 15 seconds so idle sockets stay open. Readers skip it.
- Errors found before the stream opens (bad input, a missing tool, a 409) are normal JSON errors with their own status. The service runs these checks before it returns the stream job.
- Closing the stream (the client aborts the request) fires the job's abort signal. What that does depends on the route:

| Stream | Closing it |
|---|---|
| `POST /downloads`, `POST /downloads/:downloadId/resume` | cancels the download and deletes its pending record (the partial file stays) |
| `POST /download-batches` | stops the current item and skips the rest |
| `POST /transcriptions` | stops FFmpeg and whisper.cpp |
| `GET /instagram/media` (stream form) | stops the instaloader profile helper |
| `POST /tools/:toolId/install`, `POST /tools/:toolId/update` | nothing: the install keeps running, and a later request finds the tool ready |
| `POST /whisper-models/:modelId/download` | nothing: the download keeps running |

Events per stream:

| Stream | Events in order | `done` result fields |
|---|---|---|
| Tool install and update | `phase`, `progress`, `log` (any order, repeated), then `done` | `tool` (a `Tool`) |
| Download and resume | `start`, then `warning`, `title`, `phase`, `progress`, `log` (repeated), then `paused` or `done` | `title`, `filePath` |
| Download batch | `start`, then per item `itemStart`, `itemProgress`, `itemDone`, with `warning` as needed, then `done` | `succeededCount`, `failedCount` |
| Whisper model download | `phase`, `progress`, then `done` | `model` (a `WhisperModel`) |
| Transcription | `phase` (`extracting`, then `transcribing`), `progress`, `chunk`, then `done` | `text`, `outputPath` |
| Instagram media | `profile`, `progress` (one per post), then `done` | `media` (an `InstagramMedia`) |

A paused download ends with `paused` (`{ download }`) instead of `done`. That is the one exception to "the last event is `done`".

## Health

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/health` | Lets Electron and `npm run dev` know the server is up. Answered before the JSON parser and before any tool check. | 200 `{ ok: true }` | 403 | no |

## Tools (`src/routes/toolRoutes.ts`)

`toolId` is one of `ytdlp`, `ffmpeg`, `whisper`, `instaloader` (`ToolId` in `shared/types/tools.ts`).

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/tools` | Status of every tool. `?ids=ytdlp,ffmpeg` checks only those. | 200 `ListResponse<Tool>` | 400 unknown id in `ids` | no |
| GET | `/api/v1/tools/:toolId` | Status of one tool | 200 `DataResponse<Tool>` | 404 unknown tool | no |
| POST | `/api/v1/tools/:toolId/install` | Installs the tool if it is missing. An installed tool sends a `phase` with `isSkipped: true`. | 200 stream, `ToolInstallEvents` | 404 unknown tool, 409 already installing | yes |
| POST | `/api/v1/tools/:toolId/update` | Downloads the newest yt-dlp release over the installed one | 200 stream, `ToolInstallEvents` | 400 not `ytdlp`, 404 unknown tool, 409 already installing, 503 yt-dlp not installed | yes |
| GET | `/api/v1/tools/ytdlp/releases/latest` | Live check of yt-dlp's latest GitHub release against the installed version (ADR-022) | 200 `DataResponse<YtdlpRelease>` | 502 GitHub unreachable or the installed version unreadable, 503 yt-dlp not installed | no |

`/ytdlp/releases/latest` is registered before `/:toolId`, so the path is never read as a tool id. A failed install or update ends with a `phase` event of `phase: 'error'` and a `done` with code `UPSTREAM_FAILED`. For `instaloader`, `missingRequirement: 'python'` means Python itself is missing, and the install stream fails with a message that says to install Python 3.

## Media (`src/routes/mediaRoutes.ts`)

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/youtube/media?url=` | Metadata for a YouTube video, Shorts, channel tab or playlist. A channel tab or a playlist is listed without opening each video. | 200 `DataResponse<YouTubeMedia>` | 400 missing or non-YouTube link, 502 yt-dlp failed, 503 yt-dlp not installed, 504 timed out (60 s for a video, 5 min for a channel tab or playlist) | no |
| GET | `/api/v1/instagram/media?url=&account=` | Metadata for an Instagram post, reel, story or profile. With `Accept: text/event-stream` it streams profile progress instead. | 200 `DataResponse<InstagramMedia>`, or a stream of `InstagramMediaEvents` | 400 missing or non-Instagram link or bad `account`, 502 lookup failed, 503 yt-dlp (posts) or Python or instaloader (profiles) not installed, 504 timed out | when asked |

`YouTubeMedia` has three kinds, picked from the link by `parseYouTubeUrl()`:

| Link | `kind` | `urlType` | What comes back |
|---|---|---|---|
| `watch?v=<id>`, `youtu.be/<id>` | `video` | `video` | the video with its formats. A valid `list=` parameter does not turn it into a playlist; it fills `playlistUrl` with the clean playlist link, so the page can offer to open the whole list. Otherwise `playlistUrl` is `null`. |
| `shorts/<id>` | `video` | `shorts` | the same, with `playlistUrl: null` |
| `@name`, `channel/UC...`, `c/name` or `user/name`, with an optional `/videos`, `/shorts`, `/streams` or `/playlists` tab | `channel` | `channel` for a bare link, otherwise `channel-videos`, `channel-shorts`, `channel-streams` or `channel-playlists` | `tab` names the tab; a bare link opens `videos`. The videos, Shorts and streams tabs fill `entries` and leave `playlists` empty. The playlists tab fills `playlists` (each with a clean `playlist?list=` link) and leaves `entries` empty. |
| `playlist?list=<id>` | `playlist` | `playlist` | the title, the owner and `entries`. `videoCount` is YouTube's own count, which can include unavailable videos YouTube leaves out of the listing. |

A list id must be 10 to 64 letters, digits, `_` or `-`. Other channel pages (community, the current live video) and every other YouTube path are refused with 400.

Each entry (`VideoEntry`) has a `status`. `upcoming` and `live` come from yt-dlp's `live_status` (`is_upcoming`, `is_live`). `unavailable` means the entry's `availability` is `private`, `needs_auth`, `premium_only` or `subscriber_only`, or its title is `[Private video]`, `[Deleted video]` or `[Unavailable video]`. Every other entry, including a finished stream, is `available`. An entry's `url` is always a clean watch or Shorts link, so the frontend can send the picked entries to `POST /download-batches` as they are.

For Instagram, `account` names a saved account whose session the profile helper uses. If that account has no session, any saved account with a session is used. Posts, reels and stories are read logged out through yt-dlp (ADR-030), with one retry after 4 seconds if Instagram rate-limits the request. A profile is read through the instaloader helper, which stops after 500 posts and sets `isTruncated`. In the stream form, a missing Python or instaloader is reported in the `done` event, because that check runs after the stream opens.

## Downloads (`src/routes/downloadRoutes.ts`)

A download is one YouTube video or Shorts link, or one Instagram post, reel or story link. Channel, playlist and profile links are refused (ADR-031). A YouTube channel or playlist link gets its own message, which says to open it on the YouTube page and pick the videos. A watch link with a `list=` parameter downloads only that video. `downloadId` is 16 lowercase hex characters, derived from the link and the options, so the same request always gets the same id.

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/downloads?status=` | Downloads with a pending record, newest first. `status` is `active`, `paused` or `interrupted`. | 200 `ListResponse<Download>` | 400 unknown status | no |
| POST | `/api/v1/downloads` | Starts a download. Body: `CreateDownloadRequest`; only `url` is required. The `start` event carries the download and its id. | 200 stream, `DownloadEvents` | 400 bad body or a link that cannot be downloaded, 409 the same download is running, 503 yt-dlp not installed | yes |
| GET | `/api/v1/downloads/:downloadId` | One download | 200 `DataResponse<Download>` | 404 unknown or malformed id | no |
| POST | `/api/v1/downloads/:downloadId/pause` | Stops the running download and keeps its record, so it can resume (ADR-020) | 200 `DataResponse<Download>` with `status: 'paused'` | 404 unknown id, 409 not running | no |
| POST | `/api/v1/downloads/:downloadId/resume` | Runs a paused or interrupted download again with its saved options. yt-dlp continues its `.part` file. | 200 stream, `DownloadEvents` | 404 unknown id, 409 already running, 503 yt-dlp not installed | yes |
| DELETE | `/api/v1/downloads/:downloadId` | Cancels a running download, or dismisses a paused or interrupted record. The partial file stays on disk. | 204 | 404 neither running nor recorded | no |

`status` is worked out when the record is read: `paused` if it has `pausedAt`, `active` if this process is running it, otherwise `interrupted` (the app closed while it ran). Warnings in the stream cover a download folder that does not exist (the file goes to the default folder), a missing FFmpeg, and, for Instagram, content that may need a login. A download that fails ends with `UPSTREAM_FAILED` and yt-dlp's last error line. A cancelled one ends with `CANCELLED`.

## Download batches (`src/routes/downloadRoutes.ts`)

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| POST | `/api/v1/download-batches` | Downloads a list of YouTube and Instagram links one after another. Body: `CreateDownloadBatchRequest` with 1 to 1000 `items`, each one a single video link such as a picked `VideoEntry.url`. | 200 stream, `DownloadBatchEvents` | 400 bad body or any link that cannot be downloaded, 503 yt-dlp not installed | yes |

Batch items have no pending record and cannot be paused. Instagram items are paced: yt-dlp waits 2 seconds between its own requests (`--sleep-requests 2`), and the batch waits 2.5 seconds between Instagram items. When `fileName.sequenceNumber` is set, each item counts up from it. A warning that applies to every item is sent once. One failed item does not stop the batch; its `itemDone` has `isSuccess: false` and a `message`. A cancelled batch ends with `done` code `CANCELLED`.

## Whisper models (`src/routes/transcriptionRoutes.ts`)

`modelId` is one of `tiny`, `base`, `small`, `medium`, `large`.

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/whisper-models` | All five models and whether each is downloaded | 200 `ListResponse<WhisperModel>` | none | no |
| GET | `/api/v1/whisper-models/:modelId` | One model | 200 `DataResponse<WhisperModel>` | 404 unknown model | no |
| POST | `/api/v1/whisper-models/:modelId/download` | Downloads the model from Hugging Face if it is missing | 200 stream, `ModelDownloadEvents` | 404 unknown model, 409 already downloading | yes |

## Transcriptions (`src/routes/transcriptionRoutes.ts`)

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| POST | `/api/v1/transcriptions` | Transcribes an audio or video file with whisper.cpp | 200 stream, `TranscriptionEvents` | 400 bad body, missing `file` field, unsupported file type or a file over 2 GB, 404 no file at `filePath`, 409 model not downloaded, 503 whisper.cpp not installed | yes |

The route takes two body types:

- JSON `CreateTranscriptionRequest`: `{ filePath, modelId, language }`. `filePath` must be an absolute path to a file on disk.
- `multipart/form-data` with the file in a field named `file`, plus optional `modelId` and `language` text fields. The upload is saved to the system temp folder and deleted when the transcription ends.

`modelId` defaults to `base`. `language` defaults to `auto`, or takes a two or three letter code such as `en`. A file that is not `.wav` is first converted by FFmpeg, so FFmpeg must be installed for it; that failure arrives in `done`. The transcript is written as a `.txt` beside the input file, and `outputPath` names it. whisper.cpp is stopped after 30 minutes.

## Instagram accounts (`src/routes/instagramAccountRoutes.ts`)

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/instagram/accounts` | Saved accounts: `username`, `addedAt`, `hasSession`. Never any session content. | 200 `ListResponse<InstagramAccount>` | none | no |
| POST | `/api/v1/instagram/accounts` | Logs in with `{ username, password }` through the instaloader login helper | 201 `{ data: { status: 'loggedIn', account } }`, or 202 `{ data: { status: 'twoFactorRequired', username } }` | 400 bad username or password, 502 Instagram refused the login, 503 Python or instaloader not installed, 504 no answer in 45 s | no |
| POST | `/api/v1/instagram/accounts/:username/two-factor` | Sends `{ code }` (6 to 8 digits) to the login that is waiting for it | 201 `DataResponse<InstagramAccount>` | 400 bad username or code, 404 no login is waiting, 502 Instagram refused the code, 504 no answer in 45 s | no |
| DELETE | `/api/v1/instagram/accounts/:username` | Removes the account and deletes its session file | 204 | 400 bad username, 404 no saved account | no |

A login waiting for a two-factor code is kept for 5 minutes, then stopped. Starting a new login for the same username replaces the waiting one.

## Folders and images (`src/routes/fileRoutes.ts`)

| Method | Path | Purpose | Success | Errors | Streams |
|---|---|---|---|---|---|
| GET | `/api/v1/folders/:folderPath` | Checks that a folder exists. `folderPath` is one URL-encoded path segment, such as `/folders/C%3A%5CUsers%5CVideos`. | 200 `DataResponse<Folder>` (`{ path, exists: true }`) | 400 not an absolute path, 404 not a folder | no |
| POST | `/api/v1/folders/pick` | Shows the system folder dialog (see below) | 200 `DataResponse<PickedFolder>`; `path` is `null` if the person closed it or left it open for 2 minutes | 501 the dialog tool is missing or the platform has none, 502 the dialog tool failed | no |
| GET | `/api/v1/images?url=` | Image proxy for YouTube and Instagram thumbnails, which block hotlinking | 200 with the image bytes and `Cache-Control: private, max-age=3600` | 400 missing or invalid URL, 403 not https or host not allowed, 502 the host failed, timed out, redirected more than 3 times, or did not answer with an image | no |

The desktop app picks folders with Electron's own dialog (`window.electronAPI.openFolderDialog()`), on every platform. `POST /folders/pick` only serves the frontend when it runs in a plain browser. Each platform has its own picker in `src/services/folders/`:

| Platform | Dialog | Closed without choosing | Tool missing |
|---|---|---|---|
| Windows | PowerShell `FolderBrowserDialog` | prints nothing | 501 |
| macOS | `osascript -e 'POSIX path of (choose folder with prompt "Select Download Folder")'`; the trailing slash is removed | exit code 1 with "User canceled. (-128)" | 501 |
| Linux | `zenity --file-selection --directory`, then `kdialog --getexistingdirectory` if zenity is not installed | exit code 1 | 501 when neither is installed: "The folder picker needs zenity or kdialog. Install one of them, or type the folder path instead." |

Any other exit code is a 502 with the tool's last error line. Any other platform answers 501. `/folders/pick` is registered before `/folders/:folderPath`, so `pick` is never read as a path.

## Old routes and their replacements

The TypeScript rewrite replaced every 1.x route (ADR-024). Use this table when reading old code, old issues or old logs.

| 1.x route | Replacement |
|---|---|
| `GET /api/setup` | `POST /api/v1/tools/ytdlp/install` and `POST /api/v1/tools/ffmpeg/install` |
| `GET /api/setup/check` | `GET /api/v1/tools?ids=ytdlp,ffmpeg` |
| `GET /api/ytdlp-status` | `GET /api/v1/tools/ytdlp` |
| `GET /api/ytdlp-update-check` | `GET /api/v1/tools/ytdlp/releases/latest` |
| `GET /api/ytdlp-update` | `POST /api/v1/tools/ytdlp/update` |
| `GET /api/transcribe/setup/check` | `GET /api/v1/tools/whisper` |
| `GET /api/transcribe/setup` | `POST /api/v1/tools/whisper/install` |
| `GET /api/instagram/setup/python/check` | `GET /api/v1/tools/instaloader` (`missingRequirement`) |
| `GET /api/instagram/setup/instaloader` | `POST /api/v1/tools/instaloader/install` |
| `POST /api/info` | `GET /api/v1/youtube/media?url=` |
| `POST /api/instagram/info` | `GET /api/v1/instagram/media?url=` |
| `GET /api/instagram/info-stream` | `GET /api/v1/instagram/media?url=` with `Accept: text/event-stream` |
| `GET /api/download` | `POST /api/v1/downloads` |
| `GET /api/instagram/download` | `POST /api/v1/downloads` |
| `GET /api/download/pending` | `GET /api/v1/downloads` |
| `POST /api/download/:id/pause` | `POST /api/v1/downloads/:downloadId/pause` |
| `GET /api/download` again with the saved options | `POST /api/v1/downloads/:downloadId/resume` |
| `DELETE /api/download/pending/:id` | `DELETE /api/v1/downloads/:downloadId` |
| `GET /api/instagram/bulk-download` | `POST /api/v1/download-batches` |
| `GET /api/transcribe/models` | `GET /api/v1/whisper-models` |
| `GET /api/transcribe/model/ensure` | `POST /api/v1/whisper-models/:modelId/download` |
| `POST /api/transcribe/file` | `POST /api/v1/transcriptions` (JSON body) |
| `POST /api/transcribe/upload` | `POST /api/v1/transcriptions` (multipart body) |
| `GET /api/instagram/accounts` | `GET /api/v1/instagram/accounts` |
| `DELETE /api/instagram/accounts/:username` | `DELETE /api/v1/instagram/accounts/:username` |
| `POST /api/instagram/login` | `POST /api/v1/instagram/accounts` |
| `POST /api/instagram/login/2fa` | `POST /api/v1/instagram/accounts/:username/two-factor` |
| `POST /api/instagram/session/import` | removed; the UI never called it |
| `GET /api/dialog/folder` | `POST /api/v1/folders/pick` |
| `GET /api/validate-path` | `GET /api/v1/folders/:folderPath` |
| `GET /api/proxy/img` | `GET /api/v1/images?url=` |
| `GET /health` | `GET /health` (unchanged) |

1.x streams ended with an `error` event on failure. Now a failure is a `done` event with `success: false`.

## Adding a route

See `docs/features/NEW_API_ROUTE.md`.
