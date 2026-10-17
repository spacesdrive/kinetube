# Testing

## Test runners

| Layer | Runner | Where the tests live |
|---|---|---|
| Backend | Node's built-in `node:test` with `node:assert/strict`, plus `supertest` for routes | `backend/tests/`, mirroring `backend/src/` |
| Frontend | Vitest with jsdom and Testing Library (`@testing-library/react`) | `frontend/tests/`, mirroring `frontend/src/` |

The backend tests are TypeScript files that Node runs directly. Node 22.18 and newer strip the types before running a file (type stripping), so the tests need no build step and no extra test package. This is also why the backend imports its own files with a `.ts` extension.

Vitest is the only extra runner, because the frontend already builds with Vite. Electron and the scripts in `scripts/` have no automated tests.

## Running the tests

From the repository root:

```bash
npm run typecheck   # tsc for shared and electron, then the backend, then the frontend
npm test            # backend tests, then frontend tests
```

One layer at a time:

```bash
cd backend && npm test          # node --test "tests/**/*.test.ts"
cd frontend && npm test         # vitest run
```

One file at a time:

```bash
cd backend && node --test tests/routes/apiRoutes.test.ts
cd frontend && npx vitest run tests/services/eventStream.test.ts
```

The release workflow runs `npm run typecheck && npm test` on all three platforms before it packages anything (see `docs/workflows/RELEASE.md`).

## Current numbers

Counted on 2026-10-17 from `cd backend && npm test` and `cd frontend && npx vitest run`:

| Layer | Test files | Tests | Result |
|---|---|---|---|
| Backend | 27 | 204 (in 55 suites) | all pass |
| Frontend | 18 | 88 | all pass |

## Backend test setup

- Every test file ends in `.test.ts` and sits in the folder that matches its source file. `tests/platforms/youtube/youtubeUrl.test.ts` tests `src/platforms/youtube/youtubeUrl.ts`.
- Shared helpers live in `backend/tests/fixtures/`:

| Fixture | What it gives a test |
|---|---|
| `fakeManagers.ts` | Fake yt-dlp, FFmpeg, whisper.cpp and instaloader managers that never run a binary. `createFakeYtdlp()` records every download run; the test feeds it output lines with `emit()` and ends it with `exit()`. It answers metadata lookups with `metadata` and records each one's arguments and timeout in `metadataCalls`. `createFakeManagers()` returns all four. |
| `youtubeSamples.ts` | Trimmed real yt-dlp `--flat-playlist` output: a playlist (with a private entry added the way yt-dlp lists one), a channel playlists tab and a channel streams tab with upcoming, live and finished streams |
| `tempDir.ts` | `makeTempDir()` and `removeDir()`, plus `makeTempPaths()`, a throwaway data folder laid out like `userData` so no test touches real downloads, models or sessions |
| `sseEvents.ts` | `parseSseBody()`, which turns a stream response body into a list of `{ event, data }` objects and skips keepalive comments |

- Route tests build the real app with `createApp` from `src/app.ts`, real services from `createServices` in `src/container.ts`, the fake managers and a silent logger. They never bind a port.
- `supertest` picks its own port, so every route test sets a `Host` header of `localhost:3001`. Without it the origin guard answers 403, as it would for any request addressed to another host.

## Frontend test setup

- `frontend/vite.config.ts` sets the test environment to `jsdom`, includes `tests/**/*.test.{ts,tsx}`, and loads `tests/setup.ts` before each file.
- Vitest globals stay off, so every test imports `describe`, `it`, `expect` and `vi` from `vitest`. Because of that, Testing Library cannot register its own cleanup between tests. `tests/setup.ts` registers `afterEach(cleanup)` once for every file. Without it, a query by role or position can match an element left over from the previous test.
- jsdom has no `window.matchMedia`, and next-themes asks it for the system theme. `tests/setup.ts` adds one that always answers "light", so components that read the theme can render.
- Tests import source files through the `@/` alias (for example `@/services/request`). Imports from `@shared/*` must be type-only, because Vitest does not resolve that alias at run time.
- Tests that call the API stub `fetch` with `vi.stubGlobal('fetch', ...)` and undo it with `vi.unstubAllGlobals()` in `afterEach`. No test reaches a real backend.

## What is covered

### Backend (27 files)

| Test file | What it covers |
|---|---|
| `config.test.ts` | `readConfig` (port, loopback host, data folder, frontend folder) and `createAppPaths` / `ensureAppDirs` |
| `lib/httpDownload.test.ts` | File downloads with progress against a local HTTP server: redirects, the redirect limit, non-200 answers, a dropped connection |
| `lib/lineSplitter.test.ts` | Splitting process output into lines, `parseJsonLine` and `isRecord` |
| `lib/messageQueue.test.ts` | The message queue that reads replies from the instaloader Python helpers |
| `lib/versions.test.ts` | `isNewerVersion` part-by-part version comparison |
| `managers/ffmpeg/ffmpegBinary.test.ts` | FFmpeg binary name and download source per platform |
| `managers/whisper/whisperManager.test.ts` | Transcript cleanup, the model list, the whisper.cpp binary name |
| `managers/whisper/whisperFormats.test.ts` | Parsing whisper's timestamped lines, and each transcript format: SRT and VTT times, LRC minutes past an hour, CSV quoting, TSV tabs, JSON seconds, a recording with no speech |
| `managers/ytdlp/ytdlpArgs.test.ts` | yt-dlp arguments for downloads and metadata, and format selection |
| `managers/ytdlp/ytdlpBinary.test.ts` | yt-dlp asset, binary name and download URL per platform |
| `managers/ytdlp/ytdlpFileNames.test.ts` | Output file name templates (prefix, suffix, numbering, custom template) |
| `managers/ytdlp/ytdlpOutput.test.ts` | Parsing yt-dlp progress lines and summarizing its error output |
| `platforms/instagram/instagramUrl.test.ts` | Instagram post, reel, story and profile links, reserved paths, tracking parameters |
| `platforms/mediaUrl.test.ts` | `parseDownloadTarget` (which links can be downloaded) and `isInstagramUsername` |
| `platforms/youtube/youtubeEntries.test.ts` | Entry status (upcoming, live, unavailable from `availability` or a `[Private video]` title), clean watch and Shorts links for entries, playlist entries of a channel playlists tab |
| `platforms/youtube/youtubeMetadata.test.ts` | Video and audio format lists, channel avatar choice, mapping yt-dlp JSON to videos (with `playlistUrl`), channel tabs (streams and playlists) and playlists |
| `platforms/youtube/youtubeUrl.test.ts` | Every supported YouTube link shape and rejected input: playlists, watch and youtu.be links with a list, each channel tab, malformed list ids, other channel pages |
| `routes/apiRoutes.test.ts` | The origin guard (foreign Origin, foreign Host, Vite origin), the error shape, invalid JSON, `/health`, tools, YouTube media (videos, playlists, a channel playlists tab), downloads (a playlist link refused) and batches, Instagram accounts, Whisper models and transcriptions (the formats asked for reach whisper once each), folders and images |
| `services/downloadService.test.ts` | Finished, duplicate, paused, resumed, interrupted, cancelled and failed downloads, and yt-dlp missing |
| `services/folderService.test.ts` | The folder picker on each platform with a fake process runner: a chosen folder, a closed dialog, a timeout, a missing tool (PowerShell, zenity and kdialog), a failing tool, an unsupported platform |
| `services/downloads/downloadTracker.test.ts` | Tracking which downloads are running |
| `services/imageProxyService.test.ts` | The image host allowlist (exact host or real subdomain) and the proxy's checks |
| `services/toolService.test.ts` | One install at a time per tool, failed installs, yt-dlp-only updates, the latest-release check, instaloader without Python |
| `services/youtubeMediaService.test.ts` | Playlists and channel tabs listed flat with the 5 minute timeout, a watch link with a list opened as one video, refused links, yt-dlp missing, a timeout |
| `stores/instagramAccountStore.test.ts` | Saving, listing and removing Instagram accounts |
| `stores/pendingDownloadStore.test.ts` | Saving, updating and removing download records, a missing or corrupt file, and records written by version 1.x |
| `validators/downloadValidators.test.ts` | Channel and playlist links refused with their own message, a watch link with a list downloading one video, every playlist and Shorts entry accepted in a batch |
| `validators/pathExamples.test.ts` | The folder and file path examples in error messages for Windows, macOS and Linux |

### Frontend (18 files)

| Test file | What it covers |
|---|---|
| `components/patterns/HoldToConfirmButton.test.tsx` | A plain click never fires, a full hold fires once, letting go early cancels, holding Space works from the keyboard |
| `components/shell/CommandPalette.test.tsx` | Typing filters the commands and Enter runs the highlighted one, the arrow keys move the highlight, a pasted link becomes a fetch command, the message when nothing matches |
| `features/batch/batchResults.test.ts` | Reading pasted links, the first selection, building batch items, entries that are not downloadable left out even when selected, a playlist treated as a collection of its entries |
| `features/downloads/ProgressModal.test.tsx` | The progress dialog for one download and for a bulk download |
| `features/downloads/ResumeDownloadsBanner.test.tsx` | The resume banner: empty, singular, plural, link fallback, Resume and Dismiss |
| `features/downloads/downloadState.test.ts` | Applying stream events to download state, scaled progress, bulk downloads |
| `features/downloads/fileNamePreview.test.ts` | The file name preview and custom naming detection |
| `features/settings/AppearanceSection.test.tsx` | Choosing a theme applies it at once, with no Save |
| `features/setup/toolSetupState.test.ts` | Applying tool install events to the setup screen state |
| `features/transcribe/transcribeQueueState.test.ts` | Transcription queue items, with their formats and written files |
| `features/youtube/VideoEntryRow.test.tsx` | The row's Download menu opens with its label and downloads the quality picked |
| `lib/transcriptFormats.test.ts` | Transcript file names, formats read back from written files, the format list in a sentence, cleaning a stored list |
| `features/youtube/collectionFilters.test.ts` | Only available entries can be downloaded, search then filter chips, the download targets with and without ticked entries |
| `lib/commands.test.ts` | `filterCommands`: every command for an empty query, every word matched in any order, no match, a pasted link turned into one fetch command |
| `lib/format.test.ts` | Formatting helpers (counts, dates, durations under a minute and over an hour, sizes, speeds, word counts) |
| `lib/qualities.test.ts` | Which qualities a video offers from its tallest stream, everything offered when the heights are unknown |
| `lib/settings.test.ts` | Loading saved settings and turning them into file name options |
| `lib/urlCleaners.test.ts` | Cleaning YouTube links (share parameters, watch links with a list, youtu.be links with a playlist, playlist links, Shorts, channel tabs, a missing https), cleaning Instagram links, spotting Instagram links |
| `services/eventStream.test.ts` | Parsing stream event blocks and the fetch-based stream reader |
| `services/request.test.ts` | The request helper: the `/api/v1` prefix, `ApiError` from the error shape, a non-JSON error, an unreachable backend |

Add a test in the same change whenever you add a parser, mapper, validator, store, service rule or route that does not need the network.

## What is not automated

- Real tool runs. Downloading, unpacking, building and running yt-dlp, FFmpeg, whisper.cpp and instaloader needs the network, real processes, and (for whisper.cpp on macOS and Linux) a C/C++ toolchain. The tests cover the platform choices (which asset, which binary name) and use fake managers everywhere else. The real runs are checked by hand with the list below and tracked per platform in `docs/philosophy/CROSS_PLATFORM.md`.
- Real YouTube and Instagram answers. Metadata mapping is tested with fixed yt-dlp JSON. Whether YouTube or Instagram still answers the same way is checked by hand.
- Resuming a partial file. The tests cover the download records and the pause and resume flow with a fake yt-dlp. Whether yt-dlp continues a `.part` file instead of starting again is yt-dlp's own behavior and is checked by hand.
- The yt-dlp update and the GitHub release check. The comparison logic is tested. The live call to GitHub and the binary download are checked by hand.
- Electron. The window, the backend process, IPC and the auto-updater are checked by running the app.
- Most React components. `ProgressModal`, `ResumeDownloadsBanner`, `HoldToConfirmButton`, `CommandPalette` and `AppearanceSection` have component tests. The other features are covered through their pure state modules.
- The look of the app. Tokens, both themes, the 960 px window, animations and toasts are checked by hand against `docs/design-reference.md` and the screenshots in `docs/screenshots/after/`.

## Manual verification checklist

Run this before you ship any change the automated tests do not fully cover. Use `npm run dev` unless a step says to use a packaged build.

### Startup and setup screen

- [ ] `npm run dev` starts the backend, Vite and the Electron window
- [ ] The backend logs that it is listening before it logs the yt-dlp and FFmpeg status
- [ ] `npm run dev` from an editor terminal (for example the VS Code terminal) still opens the window. These terminals can set `ELECTRON_RUN_AS_NODE`, which `scripts/run-electron.mts` removes (ADR-018).
- [ ] With yt-dlp and FFmpeg removed from `backend/downloads/`, the setup screen installs yt-dlp, then FFmpeg, with progress for each, and opens the app when both are done
- [ ] Turn off the network during setup: the tool shows an error, the screen says some tools didn't install, and "Continue anyway" opens the app

### YouTube

- [ ] Paste a video link: the title, thumbnail and quality choices appear
- [ ] Paste a Shorts link: it opens as a video, not as a channel
- [ ] Paste a link with tracking parameters or a playlist parameter: it opens the single video, and offers to open the playlist
- [ ] Paste a playlist link (`youtube.com/playlist?list=...`): the title, owner and videos load; private or deleted videos are marked and can't be selected; select several videos and download them
- [ ] Try to download a playlist link as a single download: it is refused with a message that says to pick the videos
- [ ] Download a video at 1080p or higher: FFmpeg merges video and audio into one file
- [ ] Download as MP3: the file plays
- [ ] Paste a channel link: the channel and its videos load; select several videos and download them
- [ ] Open the channel's Shorts, Live and Playlists tabs (`/shorts`, `/streams`, `/playlists`): each loads its own list. On Live, upcoming and running streams are marked and can't be selected
- [ ] On the Playlists tab, open one playlist: it loads as a playlist

### Instagram

- [ ] Paste a public post or reel link: it loads and downloads without a login
- [ ] Log in with an account that uses two-factor authentication: the code form appears and the account is listed after the code
- [ ] Remove the account from the sidebar: the dialog asks for a hold on "Hold to remove". A click does nothing, letting go early cancels, and a full hold removes the account and deletes its session file from the sessions folder
- [ ] Paste a profile link: posts load with progress, and selected posts download one after another with a short pause between them

### Batch download page

- [ ] Open Batch download from the sidebar: it is its own page, and the Instagram accounts show in the sidebar
- [ ] Paste several YouTube and Instagram links, one per line, including a playlist: each link resolves, single videos and posts start selected, and the selected items download in one batch
- [ ] Go to another page and back: the pasted links and their results are still there
- [ ] A link that can't be read shows its own error card, and the other links still download
- [ ] Cancel a running batch: the current item stops and no yt-dlp or FFmpeg process is left running

### Pause, resume and cancel

- [ ] Start a large YouTube download and press Pause: it shows Paused within a second or two, and Task Manager (or `ps`) shows no yt-dlp or FFmpeg process left (ADR-021)
- [ ] Press Resume: the download continues from about where it paused, not from 0%
- [ ] Do the same with an Instagram video post: Pause and Resume work the same way
- [ ] Cancel a download: no resume offer appears for it later, and no yt-dlp or FFmpeg process is left

### Resume after closing the app

- [ ] Start a large download and close the app while it runs (or end the Electron process)
- [ ] Start the app again: the banner offers to resume it, with its title
- [ ] Press Resume: it continues from about where it stopped
- [ ] Repeat, but press Dismiss: the download leaves the banner and a toast offers Undo. Press Undo: it comes back
- [ ] Dismiss it again and let the toast close: the offer is gone after the next start, and the partial file stays on disk

### Transcription

- [ ] On the Transcribe page, install whisper.cpp if asked, then download a model: it shows as ready in the model picker
- [ ] Transcribe a local file: the text appears while it runs, and a `.txt` file with no timestamps is saved next to the source
- [ ] In Settings, pick SRT and VTT under Transcript files and press Save, then transcribe a local file: `.srt` and `.vtt` files are saved next to it, the item says "saved beside the file as SRT and VTT", and a video player shows the `.srt` as subtitles
- [ ] Open Save on a finished item and on the after-download transcript: every format is listed, and each saves a file named after the media file
- [ ] Turn off every chip but one under Transcript files: the last one stays on
- [ ] Turn on "Transcribe after download", then download a video: the transcript appears when the download finishes and is saved next to the video in the formats chosen in Settings
- [ ] Copy a transcript: a "Transcript copied" toast appears
- [ ] Open the language selector: the list opens below or above the field, not on top of it, and fades in. The quality select and the selects in Settings do the same
- [ ] With a finished queue, "Hold to clear" empties it only after a full hold. A click does nothing

### Folder picker in a plain browser

- [ ] Open the frontend in a plain browser instead of the desktop app and press the folder button: the system folder dialog opens on Windows, macOS and Linux, and the chosen folder fills the field
- [ ] Close the dialog without choosing: the field keeps its old value and no error appears
- [ ] On Linux without zenity or kdialog: the error says to install one of them or type the path
- [ ] Type a relative folder path: the error gives an example in this system's path style

### Settings and yt-dlp update

- [ ] Change the download folder, the file name options and the default quality, then press Save: a "Settings saved" toast appears. Restart the app: the settings are still there
- [ ] About shows the app version from the root `package.json` (2.0.0), in the desktop app and in a plain browser
- [ ] Settings shows the installed yt-dlp version. "Check for updates" says it is up to date or offers the newer release
- [ ] Update yt-dlp: a progress bar runs and the new version shows afterwards. `yt-dlp --version` in a terminal shows the same version
- [ ] With the network off, the yt-dlp check says GitHub could not be reached instead of saying it is up to date

### Command palette

- [ ] Press Ctrl and K (Cmd and K on macOS) on any page: the palette opens with the cursor in its field. Press it again: it closes
- [ ] The search trigger in the top bar opens it too, and shows the shortcut
- [ ] Type "batch": only the Batch download command is left. Enter opens that page
- [ ] The arrow keys move the highlight, and Enter runs the highlighted command
- [ ] Paste a YouTube or Instagram link: one "Fetch" command appears, and Enter opens the link on the right page
- [ ] Run "Fetch the link on the clipboard" with a link copied: it opens. With plain text copied: an error toast says to copy a link first

### Theme and appearance

- [ ] Switch between Light, Dark and Match the system from the sidebar's theme menu, from Appearance in Settings and from the command palette: the whole app changes at once, with no Save
- [ ] Restart the app: the chosen theme is still set
- [ ] Every page reads well in both themes at 1440 px and at 960 px, and matches the screenshots in `docs/screenshots/after/`
- [ ] Tab through a page: every control shows the same focus ring
- [ ] Turn on reduced motion in the system settings: the brand mark and popups no longer animate

### App update dialog (packaged build only)

- [ ] In development, the app's "Check for updates" in Settings says update checks only run in the installed app
- [ ] In a packaged build that is older than the latest release, the update dialog opens with the new version
- [ ] "Update now" shows the download progress; "Restart and install" restarts into the new version
- [ ] "Later" closes the dialog and the installed version keeps working

### Security checks

Run these against the dev backend on port 3001. Each of the three `curl` commands must get a `403` with the code `FORBIDDEN`.

| Check | Command |
|---|---|
| A foreign Origin is refused | `curl -i -H "Origin: https://example.com" http://127.0.0.1:3001/api/v1/tools` |
| A foreign Host is refused | `curl -i -H "Host: example.com:3001" http://127.0.0.1:3001/api/v1/tools` |
| The image proxy refuses a host off its list | `curl -i "http://127.0.0.1:3001/api/v1/images?url=https://example.com/a.jpg"` |

- [ ] All three commands above get `403`
- [ ] The backend can't be reached from another machine, because it listens on `127.0.0.1` only
- [ ] No API answer contains the contents of an Instagram session file

### Error states

- [ ] Remove yt-dlp from `backend/downloads/` and try to download: the app says yt-dlp is not installed and how to fix it, and does not crash
- [ ] Paste a link from another site: the form shows an error and nothing starts
- [ ] Turn off the network during a download: the progress dialog shows the error and the app keeps working

### Console

- [ ] Press F12: no uncaught errors and no React warnings during the flows above

## Adding a test

### Backend: a pure function

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseYouTubeUrl } from '../../../src/platforms/youtube/youtubeUrl.ts';

describe('parseYouTubeUrl', () => {
  test('a youtu.be share link becomes a watch link', () => {
    const parsed = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc123');
    assert.equal(parsed?.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});
```

### Backend: a route

```ts
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.ts';
import { createServices } from '../../src/container.ts';
import { createLogger } from '../../src/lib/logger.ts';
import { createFakeManagers } from '../fixtures/fakeManagers.ts';
import { makeTempPaths, removeDir } from '../fixtures/tempDir.ts';

import type { Express } from 'express';

describe('GET /api/v1/downloads', () => {
  let root = '';
  let app: Express;

  before(() => {
    const paths = makeTempPaths();
    root = paths.root;
    const services = createServices(createFakeManagers(), paths);
    app = createApp({ config: { port: 3001, frontendDist: null }, services, logger: createLogger(() => {}) });
  });
  after(() => removeDir(root));

  test('starts as an empty list', async () => {
    // the origin guard refuses any other Host
    const res = await request(app).get('/api/v1/downloads').set('Host', 'localhost:3001');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { data: [], total: 0 });
  });
});
```

For a stream route, read the body with `parseSseBody()` from `fixtures/sseEvents.ts` and check that the last event is `done`.

### Frontend: a pure function

```ts
import { describe, expect, it } from 'vitest';

import { cleanYouTubeUrl } from '@/lib/urlCleaners';

describe('cleanYouTubeUrl', () => {
  it('drops tracking parameters', () => {
    expect(cleanYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });
});
```

### Frontend: a component

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResumeDownloadsBanner from '@/features/downloads/ResumeDownloadsBanner';

describe('ResumeDownloadsBanner', () => {
  it('renders nothing when there is nothing to resume', () => {
    const { container } = render(<ResumeDownloadsBanner downloads={[]} onResume={vi.fn()} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
```

shadcn's `DialogContent` adds its own close button, named "Close". When a test looks for a "Close" button in a dialog, use `getAllByRole('button', { name: 'Close' })`, because `getByRole` throws when it finds more than one.
