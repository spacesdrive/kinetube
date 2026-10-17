# Error handling

Errors in KineTube follow one path. Code that finds a problem throws a typed error. One error handler turns it into a JSON error, or a stream turns it into a failed `done` event. The frontend turns either one into an `ApiError` and shows its message. This document covers each step and how to write the message.

## Typed errors

Every expected failure is an `AppError` subclass from `backend/src/lib/errors.ts`. Each one carries an `ErrorCode` (from `shared/types/api.ts`) and an HTTP status.

| Class | Code | Status | Use it when | Example from the code |
|---|---|---|---|---|
| `ValidationError` | `VALIDATION_FAILED` | 400 | the input is missing, malformed or not allowed | "That link can't be downloaded. Use a single YouTube video or Shorts link, or an Instagram post, reel or story." |
| `ForbiddenError` | `FORBIDDEN` | 403 | the origin guard refuses a request, or an image host is not allowed | "Images can only be loaded from Instagram and YouTube." |
| `NotFoundError` | `NOT_FOUND` | 404 | the thing asked for does not exist | "That download doesn't exist. It may have finished or been dismissed." |
| `ConflictError` | `CONFLICT` | 409 | the same work is already running, or a precondition is not met | "This download is already running." |
| `NotSupportedError` | `NOT_SUPPORTED` | 501 | the feature does not work on this platform | "The folder picker needs zenity or kdialog. Install one of them, or type the folder path instead." |
| `UpstreamError` | `UPSTREAM_FAILED` | 502 | YouTube, Instagram, GitHub or a tool answered with a failure | "Couldn't reach GitHub to check for a newer yt-dlp release. Check your connection and try again." |
| `ToolNotInstalledError` | `TOOL_NOT_INSTALLED` | 503 | a tool the request needs is not installed | "yt-dlp is not installed yet. Finish setup first." |
| `UpstreamTimeoutError` | `UPSTREAM_TIMEOUT` | 504 | YouTube or Instagram took too long | "YouTube took too long to answer. Try again in a moment." |

Two codes have no class:

- `INTERNAL` (500) is what any error that is not an `AppError` becomes. Its message is always `UNEXPECTED_ERROR_MESSAGE`: "kinetube hit an unexpected error. Try again, and restart the app if it keeps happening."
- `CANCELLED` only appears in a stream's `done` event, when a download or batch was cancelled.

Who throws what:

- Validators (`src/validators/`) throw `ValidationError` and `NotFoundError`.
- Services (`src/services/`) throw any of the typed errors. They run their checks before they return a stream job, so these become normal JSON errors.
- Managers (`src/managers/`) throw `ToolNotInstalledError`, `NotSupportedError`, `UpstreamError` or `UpstreamTimeoutError` where the caller needs the status. Inside an install, a manager may throw a plain `Error` with a clear message; `toolService` wraps it.

Use `errorMessage(error)` from `lib/errors.ts` to read the message of an unknown thrown value.

## The one error handler

`errorHandler(logger)` in `backend/src/middleware/errorHandler.ts` is the last middleware in `src/app.ts`. It is the only place that writes an error response.

1. `toAppError()` keeps an `AppError` as it is, and turns errors from the libraries into `ValidationError`:
   - a multer error: "The file is larger than 2 GB. Trim it or use a smaller file.", "Upload one file at a time." or "Attach the file in a field called "file"."
   - a body that is not valid JSON: "The request body isn't valid JSON."
   - a body over 1 MB: "The request body is larger than 1 MB."
2. Anything else is unexpected. It is logged as "Unexpected error" with the request id, method, path and the error's stack, and answered as 500 `INTERNAL`.
3. If the response already started (a stream), the handler only ends it. The stream reports its own failure.
4. Otherwise it answers with the status and an `ErrorResponse`:

```json
{ "success": false, "code": "NOT_FOUND", "message": "There's no whisper model called \"huge\".", "requestId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427" }
```

`apiNotFound` (mounted at `/api` after the API router) sends every unmatched `/api` path to the handler as a `NotFoundError`: "There's no API route for GET /api/v1/nothing-here."

## Controllers never catch

A controller validates, calls one service method and sends the answer. It has no `try` and no `catch`. Express 5 forwards a rejected promise from an async handler to the error handler, so a thrown error always reaches it with its status and message. A `catch` in a controller would hide the typed error or answer with a different shape.

If a controller seems to need a `catch`, the rule belongs in the service: throw the right typed error there.

## Streams report failures in done

A stream (see `docs/architecture/backend/ROUTES.md`, "Stream contract") has two kinds of failure.

| When | What the client gets |
|---|---|
| Before the stream opens: bad input, a missing tool, a lock already held | a normal JSON error with its status, from the error handler |
| After the stream opened | a `done` event with `{ success: false, code, message }`, then the stream ends |

The status of a stream is always 200 once it opened. Never try to send an error status after that.

Failures after the stream opened are handled in two places:

- `sendStream()` in `backend/src/controllers/http.ts` wraps every job. If the job throws, it logs "A stream failed" and sends a `done` with the error's code and message, or `INTERNAL` and the fixed message for an unexpected error. This is how a missing Python reaches the Instagram profile stream as `TOOL_NOT_INSTALLED`.
- Services that know what failed catch inside the job and send their own `done`. Tool installs, model downloads and transcriptions send `UPSTREAM_FAILED` with a message that starts with what failed: "Couldn't install FFmpeg. HTTP 503 for https://example.com". A tool install also sends a `phase` event with `phase: 'error'` before its `done`.

A download sends `UPSTREAM_FAILED` with yt-dlp's last error line ("The download failed. ..."), or `CANCELLED` when it was cancelled. A paused download ends with a `paused` event instead.

A problem that does not stop the work is a `warning` event, not a failure. Downloads warn when the chosen folder does not exist, when FFmpeg is missing, and when Instagram content may need a login. The batch stream sends each distinct warning once.

## Managers and helper scripts

- A failed download through `downloadFileWithProgress()` deletes the partial file before it rethrows.
- Managers delete temporary archives and source folders in `finally` blocks, so a failed install leaves nothing behind.
- `runProcess()` resolves with the exit code, output and `isTimedOut`; it rejects only when the command cannot start. The caller turns a non-zero exit into an error with a message, as `youtubeMediaService` does with `summarizeErrorOutput(stderr)`.
- The Python helpers answer `{"status": "error", "message": "..."}` (login) or `{"type": "done", "status": "error", "message": "..."}` (profile). The service passes that message on as an `UpstreamError`. If the helper stops without answering, the read rejects with an `UpstreamError`; if it does not answer in time, with an `UpstreamTimeoutError`.

## The frontend

Every request goes through `frontend/src/services/request.ts` and `frontend/src/services/eventStream.ts`.

- `ApiError` has `status`, `code` and `message`. `code` is an `ErrorCode`, or `NETWORK` when the backend could not be reached at all ("Couldn't reach the kinetube backend. Restart the app if this keeps happening.").
- `request<T>()` and `requestNoContent()` throw an `ApiError` for any status outside 2xx, built from the backend's `ErrorResponse` by `toApiError()`. A body that is not an `ErrorResponse` becomes "The backend answered with status <status>. Try again." with code `INTERNAL`.
- `openStream()` never throws. A JSON error before the stream opened, a broken connection, or a stream that ends without an end event (`done`, or `paused` for a download) all arrive as a failed `done` event, so a stream handler only has one place to look. A stream cut off early gets "The connection to the backend closed before the work finished. Try again."
- An aborted request (the caller closed the stream) is not reported as an error.

Components catch an `ApiError` and show its message in the component's own error state. They often put what the page was doing in front of it, for example `Couldn't load the models. ${message}`. `OutputFolderField.tsx` adds what happens next: `${error.message} Until then, downloads go to the default folder.` Never show a raw `alert()`, and never leave a rejected promise unhandled. A `.catch(() => {})` is fine only with a comment that says why the failure does not matter, as in `useResumableDownloads.ts`.

### Toasts for transient errors

A failure that has no place on the screen, and that the person can fix at once, is a Sonner error toast. The title says what failed and the description says what to do:

```ts
toast.error("kinetube couldn't read the clipboard.", { description: 'Paste the link into the link field instead.' });
```

Today these are the clipboard errors: no YouTube or Instagram link on the clipboard, or no permission to read it (`hooks/useAppCommands.ts`), and a transcript that can't be copied (`TranscriptPanel.tsx`, `QueueItemCard.tsx`). Errors from the backend stay inline in the component that asked, because they belong to that field, card or page.

## Writing error messages

The `message` of an error goes straight to the person. Write it for them.

- Say what failed first, then what to do: "whisper.cpp isn't installed. Open the Transcribe page to install it."
- Name things the way the UI does: "the Instagram tab", "Settings", "the setup screen", not internal names.
- When a tool's own output helps, put it after the plain sentence: "Couldn't read this link from YouTube. ERROR: Video unavailable".
- Translate operating system errors (`ENOENT`, `EACCES`, an exit code) into a sentence. A raw path or error code alone is not a message.
- Never write "Something went wrong", "An error occurred" or "Setup error". Never apologize.
- Keep it short: one or two sentences.

## Logging

Use the logger from `backend/src/lib/logger.ts`, never `console.log`. It writes one JSON line per entry to stdout, which Electron copies into `backend.log` (see `docs/architecture/backend/EXPRESS.md`, "Logging").

- Log unexpected errors with the `requestId`, so the log line matches the `requestId` the person saw.
- Pass the error as a field (`logger.error('...', { error })`); the logger keeps its name, message and stack.
- Never log a password, a session file's contents or a request's query string.
