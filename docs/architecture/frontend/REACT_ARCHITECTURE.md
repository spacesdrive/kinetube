# Frontend React architecture

## Stack

| Concern | Library | Version (from `frontend/package.json`) |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript, strict | 6.0 |
| Build tool | Vite | 8 |
| UI components | shadcn/ui, `base-nova` style, on `@base-ui/react` | `@base-ui/react` 1.5 |
| Styling | Tailwind CSS | 4 |
| Theming | next-themes | 0.4 |
| Icons | Lucide React | 1.18 |
| Toasts | Sonner (`components/ui/sonner.tsx`; no `<Toaster>` is mounted yet) | 2 |
| Tests | Vitest, Testing Library, jsdom | Vitest 4 |
| Lint | ESLint with `typescript-eslint` strict and `eslint-plugin-react-hooks` | ESLint 9 |

There is no router. `AppShell` keeps the current page in state. The pages are `youtube`, `instagram`, `transcribe` and `settings` (`lib/pages.ts`).

## Folder layout

```
frontend/
  src/
    main.tsx              entry: StrictMode, ThemeProvider, App
    App.tsx               setup gate: SetupScreen until yt-dlp and FFmpeg are installed
    AppShell.tsx          sidebar, header, the current page, and the app-wide dialogs
    index.css             Tailwind v4 and the CSS variable tokens
    vite-env.d.ts         declares window.electronAPI
    services/
      api.ts              every backend endpoint
      request.ts          fetch wrapper and ApiError
      eventStream.ts      fetch-based server-sent events reader
    pages/
      DownloadPage.tsx    the YouTube and Instagram pages
      download/           pieces of DownloadPage: hero, link form, result, profile progress, notes
    features/
      downloads/          progress dialog, resume banner, download settings, download hooks and state
      youtube/            video and channel views
      instagram/          post and profile views, login dialog, instaloader setup
      batch/              batch mode: pasted links, results, selection
      transcribe/         Transcribe page, model picker, queue
      settings/           Settings page and its cards
      setup/              first-run setup screen
    components/
      AppSidebar.tsx, AppHeader.tsx, sidebar/   the app shell
      UpdateDialog.tsx, YtdlpAlert.tsx, ...      pieces used by more than one feature
      icons/              YouTube and Instagram brand icons
      ui/                 shadcn primitives (kebab-case file names)
    hooks/                hooks used by more than one feature
    lib/                  pure helpers: settings, format, URL cleaners, qualities, pages, folder picker
  tests/                  Vitest tests, same folders as src/
```

Imports across folders use the `@/` alias (`@/services/api`). Imports inside one folder use `./`. Shared API types come from `@shared/<file>.ts`, which points at `../shared/types/`.

## Component tree

```
main.tsx
  StrictMode
    ThemeProvider                      next-themes, class attribute, system theme by default
      App                              useToolStatus decides what renders
        (nothing)                      while the first tool check runs
        SetupScreen                    features/setup, when yt-dlp or FFmpeg is missing
        AppShell
          SidebarProvider
            AppSidebar                 page links, InstagramAccountsSection, ThemeToggleItem
            SidebarInset
              AppHeader                page title, new search and batch mode buttons
              TranscribePage           page === 'transcribe'
              SettingsPage             page === 'settings'
              DownloadPage             page === 'youtube' or 'instagram'
                BatchPanel             batch mode, with BatchResultsView
                DownloadHero, FeatureNotes
                YtdlpAlert, ResumeDownloadsBanner
                UrlForm, ProfileFetchProgress
                DownloadSettingsPanel
                MediaResult            VideoView, ChannelView, InstagramPostView or InstagramProfileView
          DownloadDialog               ProgressModal, while a download is active
          InstagramLoginModal          while the login dialog is open
          UpdateDialog                 when Electron's updater reports a new version
```

`App` shows nothing while `useToolStatus` reads `GET /api/v1/tools?ids=ytdlp,ffmpeg`. If either tool is missing, it shows `SetupScreen`, which installs yt-dlp and then FFmpeg. If the backend cannot be reached, `App` shows the app anyway, and a failing download then explains the problem.

## Where state lives

There is no global store and no React context of KineTube's own. The only providers are next-themes' `ThemeProvider` and shadcn's `SidebarProvider`. State lives in hooks. `AppShell` calls the app-wide hooks and passes their results down as props.

`AppShell` keeps these values in its own `useState`: the current page, the link in the search field, batch mode, whether the login dialog is open, and this session's copy of the download settings.

| Hook | File | Owns |
|---|---|---|
| `useToolStatus` | `hooks/` | The startup check, the yt-dlp tool record, whether FFmpeg is installed. |
| `useInstagramAccounts` | `hooks/` | The saved accounts and the account chosen in the sidebar. |
| `useMediaLookup` | `hooks/` | The media found for a link, loading, error, and Instagram profile progress. A newer lookup drops the answer to an older one. |
| `useUpdateNotice` | `hooks/` | The version Electron's updater found, which opens `UpdateDialog`. |
| `useIdSet` | `hooks/` | A set of ticked ids, such as selected videos. |
| `useIsMobile` | `hooks/use-mobile.ts` | shadcn's mobile check for the sidebar. |
| `useBatch` | `features/batch/` | The pasted links and the lookup result for each one. |
| `useDownloadSession` | `features/downloads/` | Joins the three hooks below and adds the chosen Instagram account to every request. |
| `useActiveDownload` | `features/downloads/` | The one download shown in the progress dialog, and its stream. |
| `useResumableDownloads` | `features/downloads/` | Paused and interrupted downloads for the resume banner. |
| `usePostDownloadTranscription` | `features/downloads/` | The transcript made after a download finishes. |
| `useToolSetup` | `features/setup/` | Install progress for yt-dlp and FFmpeg on the setup screen. |
| `useTranscribeQueue`, `useWhisperModels`, `useWhisperSetup` | `features/transcribe/` | The file queue, the model list and downloads, the whisper.cpp install. |
| `useInstagramLogin`, `useInstaloaderSetup` | `features/instagram/` | Login with two-factor codes, and the Python and instaloader check. |
| `useAppUpdateCheck`, `useYtdlpUpdate` | `features/settings/` | The manual app update check and the yt-dlp update check on the About card. |

Pages that need nothing from the rest of the app, such as `TranscribePage` and `SettingsPage`, call their own hooks.

## The API client

Components never call `fetch`. Every request goes through `api` in `services/api.ts` (ADR-027). Each method is typed with the request, response and event types from `shared/types/`.

- `request.ts` holds `API_BASE` (`/api/v1`), `sendRequest`, `request<T>`, `requestNoContent` and `jsonInit`. A non-2xx answer becomes an `ApiError` with the backend's `code` and `message`. A network failure becomes an `ApiError` with code `NETWORK`. An abort is passed on unchanged.
- `request<T>` casts the parsed body to `T` once. The shared types are the contract for each route, so the body is trusted to match.
- `api.imageUrl(url)` builds a `/api/v1/images` link for `<img>` tags, because YouTube and Instagram refuse hotlinked images.

In development, Vite proxies `/api` to `http://127.0.0.1:3001` (`vite.config.ts`). In a packaged build the backend serves the page and the API from the same origin.

## The stream reader

`services/eventStream.ts` reads server-sent events with `fetch` instead of `EventSource` (ADR-025). It can send a POST with a body, and it never reconnects on its own.

`openStream(path, init, onEvent)` sets `Accept: text/event-stream`, sends the request and returns a `StreamHandle`:

- `close()` aborts the request. The backend then cancels a download or batch and stops a transcription.
- `finished` resolves when the stream ends.

The reader splits the body on blank lines and parses each block with `parseEventBlock`. Keepalive comments and broken JSON are skipped. The handler gets the event name and data as a pair, so checking the name narrows the type of the data.

The handler always gets an end event, even when something fails on the way. The end event is `done`, or one of the `endEvents` passed to `openStream`: the download streams also end on `paused`.

- An error answer before the stream opens becomes a failed `done` with the backend's code and message.
- A stream that ends without an end event becomes a failed `done` that says the connection closed.
- A request that throws becomes a failed `done`, unless the caller closed it.

## How stream events become state

Each stream has a pure reducer in a `*State.ts` file. A reducer takes the current state and one event and returns the next state. It has no side effects, so it is unit tested without rendering.

| File | Reducer | Used by |
|---|---|---|
| `features/downloads/singleDownloadState.ts` | `applyDownloadEvent` | `useActiveDownload` |
| `features/downloads/bulkDownloadState.ts` | `applyBatchEvent` | `useActiveDownload` |
| `features/setup/toolSetupState.ts` | `applyToolEvent` | `useToolSetup` |
| `features/transcribe/transcribeQueueState.ts` | `applyTranscriptionEvent` | `useTranscribeQueue` |

A hook opens the stream and passes each event to the reducer inside a state updater:

```ts
replaceStream(open((...event) => {
  // side effects stay outside the state updater, which StrictMode runs twice
  const [name, data] = event;
  if (name === 'done' && data.success && data.filePath && shouldTranscribe) onFileSavedRef.current(data.filePath, false);
  setActive((previous) => (previous?.kind === 'single' ? applyDownloadEvent(previous, ...event) : previous));
}));
```

Work that is not a state change, such as starting a transcription, runs in the handler before the updater, never inside it. A callback that a handler needs later is read through a ref, because the handler outlives the render that created it.

## Settings in localStorage

`lib/settings.ts` owns the saved settings. They are stored under the `localStorage` key `kinetube_settings`, the key 1.x used, so older settings still load.

- `loadSettings()` merges the stored value over `DEFAULT_SETTINGS`. A missing or corrupt value gives the defaults, and an unknown quality falls back to `best`.
- `saveSettings()` writes the whole object. Only `SettingsPage` calls it.
- `AppShell` keeps a per-session copy of the download preferences (`DownloadSettings`, with a numbering start). Saving in Settings replaces that copy but keeps the numbering start the person typed.
- `toFileNameOptions()` turns the settings into the `fileName` object each download request sends.

The backend never reads these settings. Each request carries the values it needs.

## shadcn on Base UI

The shadcn primitives in `components/ui/` use the `base-nova` style (`components.json`), built on `@base-ui/react`, not Radix. To render a primitive as another element, pass that element in the `render` prop. There is no `asChild`.

```tsx
<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Download ${video.title}`} />}>
```

The files in `components/ui/` are generated. They keep shadcn's own formatting and kebab-case names. Add a primitive with the shadcn CLI instead of writing it by hand.

## The Electron bridge

`window.electronAPI` is typed in `vite-env.d.ts` as optional `ElectronApi` from `shared/types/electron.ts`. It is missing when the frontend runs in a plain browser, so every call checks it: `window.electronAPI?.onUpdateStatus(...)`. See `docs/architecture/electron/MAIN_PROCESS.md` for the channels.

## Tests

Tests live in `frontend/tests/`, in the same folders as the code they test (`tests/features/downloads/` for `src/features/downloads/`). Vitest runs every `tests/**/*.test.{ts,tsx}` file in jsdom. `tests/setup.ts` runs Testing Library's `cleanup` after each test, because Vitest globals are off.

- Reducers, helpers and the stream reader have unit tests (`downloadState.test.ts`, `toolSetupState.test.ts`, `eventStream.test.ts`, `settings.test.ts` and others).
- `ProgressModal` and `ResumeDownloadsBanner` have component tests with Testing Library.

Run them with `npm test` in `frontend/`, or `npm test` at the root for the backend and frontend together.

## Adding a page

1. Add the page id to `Page` and `PAGE_LABELS` in `lib/pages.ts`.
2. Create the page component in its feature folder, for example `features/<feature>/<Name>Page.tsx`, with its own hooks.
3. Render it in `AppShell` for its page id, and add a link in `AppSidebar`.
4. Add any backend calls as methods on `api` in `services/api.ts`, typed from `shared/types/`.
5. If the page reads a stream, put the event handling in a pure `*State.ts` reducer and test it.
6. Update the folder layout and component tree in this file.
