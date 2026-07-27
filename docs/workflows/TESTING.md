# Testing Strategy

## Test Runners

| Layer | Runner | Why |
|---|---|---|
| Backend (`backend/`) | Node's built-in `node:test` + `node:assert/strict`, plus `supertest` for HTTP route tests | `node:test` needs zero new dependencies for pure-logic tests; `supertest` is the one added dependency, needed to drive the Express `app` object directly without binding a real port |
| Frontend (`frontend/`) | Vitest + `@testing-library/react` + `@testing-library/dom` | Vite-native, fast, works with the existing Vite config with no extra bundler setup |

Run everything:

```bash
cd backend && npm test
cd frontend && npm test
```

Both are also runnable from the repo root via `npm test` (see root `package.json`), which runs both in sequence.

## What Is Covered

Automated coverage focuses on **pure, deterministic logic** (URL parsing, text cleanup, path resolution, platform-resolution mappings) and **HTTP routes that don't require a real network call or a working tool binary**. Code that shells out to yt-dlp/ffmpeg/whisper.cpp/instaloader against the real internet, or the Electron main process itself, is covered by the manual verification checklist below instead (see `docs/philosophy/CROSS_PLATFORM.md` for why the tool managers in particular are hard to fully automate).

| File under test | Test file | What's covered |
|---|---|---|
| `backend/utils/urlParser.js` | `backend/test/urlParser.test.js` | Every supported YouTube URL shape (video, shorts, `youtu.be`, channel `/videos`, `/shorts`, bare channel) and invalid/non-YouTube input |
| `backend/utils/instagramUrlParser.js` | `backend/test/instagramUrlParser.test.js` | Post, reel, story, profile, profile `/reels`, `/tagged`, reserved-path rejection, tracking-param stripping, invalid input |
| `backend/utils/whisperManager.js` | `backend/test/whisperManager.test.js` | `cleanTranscription()` timestamp stripping and paragraph collapsing; `MODELS` registry shape; `getModelPath()`; `getWhisperBinaryName()` per platform |
| `backend/utils/paths.js` | `backend/test/paths.test.js` | `DOWNLOADS_DIR`/`MODELS_DIR`/`SESSIONS_DIR` resolve under `ELECTRON_USER_DATA` when set, and fall back to the backend-relative default when it is not |
| `backend/utils/ytdlpManager.js` (platform resolution) | `backend/test/ytdlpManager.platform.test.js` | `getYtdlpAssetName`/`getYtdlpBinaryName`/`getYtdlpDownloadUrl` and `getFfmpegBinaryName`/`getFfmpegDownloadInfo` for `win32`/`darwin`/`linux`, and the rejection error for an unsupported platform |
| `backend/utils/download.js` | `backend/test/download.test.js` | Redirect-following, progress callback values, redirect-limit exhaustion, non-200 responses, a mid-stream connection drop, and a non-existent destination directory - driven against a throwaway local `http` server, no real network calls |
| `backend/utils/pendingDownloads.js` | `backend/test/pendingDownloads.test.js` | Id stability for identical params (no duplicate record) vs. different params (separate records), title updates, removal, and a missing/corrupt state file both resolving to an empty list |
| `backend/server.js` (Express routes) | `backend/test/routes.test.js` | `GET /health`, `GET /api/ytdlp-status` (real local check, no network), `POST /api/info` validation errors, `GET /api/validate-path`, `GET /api/transcribe/setup/check`, `GET /api/transcribe/models`, `GET /api/instagram/accounts`, `GET /api/proxy/img` allow-list enforcement, `GET /api/download/pending` + `DELETE /api/download/pending/:id`, `POST /api/download/:id/pause` (404 case) - driven with `supertest` against the exported `app` (see `docs/architecture/backend/EXPRESS.md`) |
| `frontend/src/lib/utils.js` | `frontend/src/lib/__tests__/utils.test.js` | `cn()` class merging (dedupe, conditional classes, Tailwind conflict resolution) |
| `frontend/src/lib/urlCleaners.js` | `frontend/src/lib/__tests__/urlCleaners.test.js` | `cleanYouTubeUrl()`/`cleanInstagramUrl()` tracking-param stripping for every supported URL shape, non-matching/invalid input |
| `frontend/src/lib/api.js` | `frontend/src/lib/__tests__/api.test.js` | `getJSON`/`postJSON` resolve without throwing on any status; `postJSONStrict` resolves on success and throws using the error/hint/detail fields (or a fallback message) on failure; `postRequest`/`deleteRequest` send the correct method/headers/body - `fetch` is mocked, no real network calls |
| `frontend/src/components/ProgressModal.jsx` | `frontend/src/components/__tests__/ProgressModal.test.jsx` | Null render, single-download progress/done/failure/transcribe-button states, bulk-download totals and per-item status, Close vs. Cancel button state, Pause/Resume button rendering and click callbacks |
| `frontend/src/components/ResumeDownloadsBanner.jsx` | `frontend/src/components/__tests__/ResumeDownloadsBanner.test.jsx` | Null render with no items, singular/plural copy, title vs. URL fallback, and that Resume/Dismiss call back with the clicked item |

When adding a new pure function (a new parser, a new text-cleanup helper, a new path resolver, a new platform-resolution mapping) or a new non-network route, add a test in the same pass - do not defer it.

## What Is Not Automated (and why)

- **Tool managers' actual download/extract/build/spawn execution** (`ensureYtDlp`'s real download, `ensureWhisper`'s real clone-and-compile, `transcribeFile`, `setupToolsWithProgress`) - these hit real network endpoints, spawn real OS processes, and (for whisper.cpp on macOS/Linux) require a full C/C++ toolchain. Testing the real execution would mean either mocking `https`/`child_process` extensively (low signal-to-effort) or hitting real GitHub/Hugging Face/johnvansickle.com/evermeet.cx endpoints in CI (slow, flaky, downloads hundreds of MB to several GB, and would need real macOS/Linux runners to mean anything for those platforms). The platform-*resolution* logic (which URL, which binary name) is unit tested; the actual download/build is verified manually per the checklist below and tracked in `docs/philosophy/CROSS_PLATFORM.md`'s verification table.
- **Streaming (SSE) routes end-to-end** (`/api/download`, `/api/setup`, `/api/transcribe/setup`, `/api/instagram/*download*`) - covered by manual verification only; they depend on the same real tool execution as above.
- **Electron main process** (`main.js`) - window lifecycle and IPC are exercised by running the app, not by a headless test harness.
- **Most React components** - only `ProgressModal.jsx` and `ResumeDownloadsBanner.jsx` have test suites so far. Extending coverage to other components (`VideoView.jsx`, `SettingsPage.jsx`, etc.) is tracked in `ROADMAP.md`.
- **Actually resuming a partial download** - `pendingDownloads.js`'s record-keeping is unit tested and the two routes are covered by `supertest`, but whether yt-dlp truly resumes a `.part` file byte-for-byte when re-invoked (rather than restarting) is yt-dlp's own behavior, not this app's code, and is verified manually (see the checklist below).

## Manual Verification Checklist

Run before shipping any change that isn't purely covered by the automated tests above.

### Startup
- [ ] `npm run dev` from the repo root launches backend, frontend, and the Electron window together
- [ ] Backend `/health` responds before the Electron window shows content (watch the console log order)
- [ ] `npm run dev` from a terminal inside an Electron-based editor (VS Code's integrated terminal is the common case) still opens the window - this is the scenario `ELECTRON_RUN_AS_NODE` leaks into, see `DECISIONS.md` ADR-018
- [ ] Settings -> About shows the running version and "Check for Updates" works: shows "only runs in a packaged build" in dev, and (on a packaged build) either finds/offers an update or reports up to date

### YouTube
- [ ] Paste a video URL -> metadata and quality picker appear
- [ ] Paste a Shorts URL -> resolves as a video, not a channel
- [ ] Paste a channel URL -> channel grid loads
- [ ] Download a video at a quality requiring ffmpeg merge -> succeeds if ffmpeg is installed, shows the fallback warning if not
- [ ] Extract MP3 from a video -> produces a playable file
- [ ] Start a large download, force-quit the app mid-download (not a normal close/cancel), relaunch -> `ResumeDownloadsBanner` offers to resume it; clicking Resume continues from where it left off rather than restarting from 0%
- [ ] Start a large download, click Pause -> the modal shows Paused with a Resume button almost immediately (not delayed until the download would have naturally finished - see `DECISIONS.md` ADR-021), and Task Manager shows no `yt-dlp.exe`/`ffmpeg.exe` still running afterward; click Resume -> the download continues from roughly where it paused, not from 0%
- [ ] Start a download, cancel it normally from the UI, relaunch -> no resume prompt appears for it (cancelling is not the same as the app being killed), and Task Manager shows no `yt-dlp.exe`/`ffmpeg.exe` still running after the modal closes

### Instagram
- [ ] Paste a public post/reel URL -> downloads without login
- [ ] Log in with 2FA -> completes and lists the account
- [ ] Bulk-download a profile -> progress streams, produces the expected file count

### Transcription
- [ ] First-run whisper.cpp setup completes and reports success
- [ ] Download a model -> appears as ready in the picker
- [ ] Transcribe an existing file -> produces a `.txt` next to the source with no leftover timestamp markers

### Error States
- [ ] Delete `yt-dlp.exe` from the downloads folder and retry a download -> clear, actionable error, not a crash
- [ ] Disconnect network mid-setup -> SSE `error` event surfaces in the UI, app remains usable
- [ ] Paste an unsupported URL -> `400`-style inline error, not an unhandled exception

### Console
- [ ] Open DevTools (F12) - no uncaught errors or React warnings during the above flows

## Adding a Test

Backend (`node:test`):

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseYouTubeUrl } = require('../utils/urlParser');

test('parses a standard watch URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(result.type, 'video');
    assert.equal(result.id, 'dQw4w9WgXcQ');
});
```

Backend (`supertest`, for a route):

```js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server'); // require.main !== module here, so this never binds a port

describe('GET /health', () => {
    test('responds with ok: true', async () => {
        const res = await request(app).get('/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.ok, true);
    });
});
```

Frontend (Vitest, pure function):

```js
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
    it('merges conflicting Tailwind classes, keeping the last one', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });
});
```

Frontend (Vitest + `@testing-library/react`, for a component):

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressModal from '../ProgressModal';

describe('ProgressModal', () => {
    it('shows the done message once a download finishes', () => {
        render(
            <ProgressModal
                download={{ title: 'My Video', done: true, success: true, message: 'Download complete' }}
                onClose={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(screen.getByText('Download complete')).toBeTruthy();
    });
});
```

Note: shadcn's `DialogContent` renders its own built-in icon close button (accessibly named "Close") in addition to any close button the app renders explicitly. When asserting on a "Close" button, use `getAllByRole('button', { name: 'Close' })` rather than `getByRole`, which throws on multiple matches.

Note: `frontend/vite.config.js`'s `test.globals` is deliberately left off (every test file imports `describe`/`it`/`expect`/`vi` explicitly from `'vitest'`, matching the rest of this codebase's no-implicit-globals style). Because of that, `@testing-library/react`'s automatic post-test DOM cleanup - which depends on detecting a global `afterEach` - never registers on its own. `frontend/src/test/setup.js` (wired in via `test.setupFiles`) registers `afterEach(cleanup)` once for every test file instead. Without it, a component test that queries `screen` by position or role (rather than by exact, unique text) can silently match an element left over from a previous test in the same file - this bit `ResumeDownloadsBanner.test.jsx` during development before the shared setup file was added.
