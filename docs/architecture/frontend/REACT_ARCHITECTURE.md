# Frontend React Architecture

## Stack

| Concern | Library | Version |
|---|---|---|
| Framework | React | 19 |
| Build tool | Vite | 8 |
| UI components | shadcn/ui (base-nova style) | - |
| Styling | Tailwind CSS | 4 |
| Theming | next-themes | - |
| Toasts | Sonner | - |
| Icons | Lucide React | - |
| HTTP | native `fetch` + `axios` | - |

There is no React Router - the app is a single view tree driven by local component state (`App.jsx` swaps between the search/paste screen, `VideoView`, `ChannelView`, `InstagramPostView`, `InstagramProfileView`, `BatchResultsView`, `TranscribePage`, and `SettingsPage` based on state, not URL).

## Entry: `frontend/src/main.jsx`

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## Application Shell: `frontend/src/App.jsx`

`App.jsx` is the root component and owns most top-level state directly with `useState`/`useRef`/`useCallback` - there is no global context/store. It:

- Fetches yt-dlp/ffmpeg status on mount (`fetchYtdlpStatus()`) and renders `YtdlpAlert` / `SetupScreen` if tools are missing
- Owns the pasted-URL input, the parsed metadata result, and which "view" (video/channel/Instagram post/profile/batch/transcribe/settings) is currently shown
- Cleans pasted YouTube/Instagram URLs client-side (`cleanYouTubeUrl()`/`cleanInstagramUrl()`, extracted to `lib/urlCleaners.js` and unit tested) before sending them to `/api/info`, purely for a better-looking input field - the backend's `parseYouTubeUrl()` in `backend/utils/urlParser.js` is the authoritative parser and re-validates independently
- Renders `ProgressModal` for any active download/transcription, driven by SSE events consumed with a manual `fetch` + `ReadableStream` reader (see `docs/guidelines/ERROR_HANDLING.md` for the parsing pattern)

## Directory Structure

```
frontend/src/
  main.jsx                 Entry point
  App.jsx                  Root component: view switching, URL input, SSE-driven downloads
  index.css                Tailwind v4 + CSS variable tokens
  lib/
    utils.js                cn() = clsx + tailwind-merge
    urlCleaners.js          cleanYouTubeUrl()/cleanInstagramUrl() - tracking-param stripping on paste, used by App.jsx
    __tests__/              Vitest unit tests for the files above
  hooks/
    use-mobile.js            useIsMobile()
  components/
    AppSidebar.jsx           Collapsible sidebar (shadcn Sidebar primitives)
    ChannelView.jsx          YouTube channel/playlist video grid
    VideoView.jsx             Single video metadata + quality picker
    BatchResultsView.jsx     Mixed-queue batch download results
    ProgressModal.jsx        Shared SSE progress UI (download/transcribe/setup); has a component test suite
    __tests__/               Vitest + Testing Library tests (ProgressModal.jsx so far)
    DownloadSettings.jsx     Quality/format/filename-template controls
    SetupScreen.jsx          First-run tool installation flow
    TranscribePage.jsx       Whisper model picker + transcription UI
    SettingsPage.jsx         Persisted app settings (localStorage), exports loadSettings()
    UpdateDialog.jsx         Consumes window.electronAPI.onUpdateStatus()
    YtdlpAlert.jsx           Banner shown when yt-dlp/ffmpeg is missing or outdated
    ModeToggle.jsx           Light/dark theme toggle (next-themes)
    ThemeProvider.jsx        next-themes provider wrapper
    instagram/
      InstagramLoginModal.jsx    Login + 2FA flow
      InstagramPostView.jsx      Single post/reel/story view
      InstagramProfileView.jsx   Profile bulk-download view
    ui/                      shadcn-generated primitives (40+), kebab-case, do not hand-edit generated structure
```

## State Management

There is no `Context`/global store. State lives in `App.jsx` and is passed down as props, or lives locally inside a component/page when it is not needed elsewhere (`TranscribePage`, `SettingsPage`, `InstagramProfileView` each manage their own fetch/loading/error state).

**Persisted settings** (download folder, filename template, default Whisper model, transcription language) live in `localStorage`, read/written through `SettingsPage.jsx`'s exported `loadSettings()` helper - not through any backend call. If a future feature needs settings shared across more components than currently import `loadSettings()`, that is the point to consider a small context, not before.

## Communicating with the Backend

There is no centralized `api.js` module (unlike a typical multi-page SPA) - components call `fetch()`/`axios` directly against `/api/...` paths, which the Vite dev server proxies to `:3001` (see `frontend/vite.config.js`) and which resolve as same-origin in a packaged build (Express serves both the API and the static frontend). Two call shapes are used:

- **Request/response:** `await fetch('/api/info', { method: 'POST', ... })`, parse JSON, throw on `!res.ok`.
- **Streaming (SSE):** manual `fetch` + `response.body.getReader()` loop, parsing `event:`/`data:` lines and dispatching on the `phase`/`progress`/`done`/`error` shape. `ProgressModal.jsx` is the shared consumer for this pattern - new streaming features should drive it through the same component rather than building a second progress UI.

## Electron Bridge

Renderer code that needs a main-process capability calls `window.electronAPI.*` (see `docs/architecture/electron/MAIN_PROCESS.md` for the full IPC surface). This object does not exist when the frontend is loaded outside Electron (e.g. `vite preview` in a browser) - any component that calls it must guard with `window.electronAPI?.method` or check `typeof window.electronAPI !== 'undefined'` first.

## Naming Conventions

- Component files: `PascalCase.jsx`
- Utility/hook files: `camelCase.js` / `use-kebab-case.js`
- shadcn ui files: `kebab-case.jsx` (generated convention, do not rename)

## Adding a New Page/View

1. Create `frontend/src/components/MyView.jsx` following the prop shape of an existing sibling (e.g. `VideoView.jsx` for a metadata-driven view, `TranscribePage.jsx` for a page with its own fetch lifecycle)
2. Wire it into `App.jsx`'s view-switching state - add the state flag/enum value and the conditional render branch
3. Add any new backend calls following the request/response or SSE pattern above
4. Update this file's directory structure table
