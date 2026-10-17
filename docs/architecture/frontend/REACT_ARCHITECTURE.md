# Frontend React architecture

## Stack

| Concern | Library | Version (from `frontend/package.json`) |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript, strict | 6.0 |
| Build tool | Vite | 8 |
| UI components | shadcn/ui, `base-nova` style, on `@base-ui/react` | `@base-ui/react` 1.5 |
| Styling | Tailwind CSS, with the design tokens in `styles/tokens.css` | 4 |
| Class names | `clsx` and `tailwind-merge`, joined by `cn()` in `lib/utils.ts` | `tailwind-merge` 3 |
| Fonts | Unbounded and DM Sans, self-hosted through `@fontsource-variable/unbounded` and `@fontsource-variable/dm-sans` | 5.3 |
| Theming | next-themes | 0.4 |
| Icons | Lucide React | 1.18 |
| Toasts | Sonner, through `components/ui/sonner.tsx`. `main.tsx` mounts one `<Toaster>`. | 2 |
| Tests | Vitest, Testing Library, jsdom | Vitest 4 |
| Lint | ESLint with `typescript-eslint` strict and `eslint-plugin-react-hooks` | ESLint 9 |

There is no router. `AppShell` keeps the current page in state. The pages are `youtube`, `instagram`, `batch`, `transcribe` and `settings` (`lib/pages.ts`). Batch download is a page of its own, not a mode of the YouTube page.

Every visual decision comes from `docs/design-reference.md`. Read it before you change the look of anything.

## Folder layout

```
frontend/
  src/
    main.tsx              entry: StrictMode, ThemeProvider, TooltipProvider, App and the Toaster
    App.tsx               setup gate: SetupScreen until yt-dlp and FFmpeg are installed
    AppShell.tsx          sidebar, top bar, the current page, the command palette and the app-wide dialogs
    index.css             Tailwind v4, the fonts, the token mapping and the custom utilities
    vite-env.d.ts         declares window.electronAPI and __APP_VERSION__
    styles/
      tokens.css          every colour, radius, shadow, layout size and motion value, light and dark
    assets/
      brand/              the 96 px brand marks, imported through Vite
    services/
      api.ts              every backend endpoint
      request.ts          fetch wrapper and ApiError
      eventStream.ts      fetch-based server-sent events reader
    pages/
      DownloadPage.tsx    the YouTube and Instagram pages
      download/           pieces of DownloadPage: hero, link form, quick actions, supported links, result, profile progress
    features/
      downloads/          progress dialog, resume banner, download options sheet, selection bar, download hooks and state
      youtube/            video view, channel tabs, playlists, the shared video list and its filters
      instagram/          post and profile views, login dialog, instaloader setup
      batch/              the Batch download page: pasted links, results, selection
      transcribe/         Transcribe page, model picker, queue
      settings/           Settings page and its sections
      setup/              first-run setup screen
    components/
      shell/              sidebar, top bar, brand mark and lockup, theme switcher, command palette, Instagram accounts
      patterns/           page patterns built on the tokens (see "Patterns")
      UpdateDialog.tsx, YtdlpAlert.tsx, QualitySelect.tsx, ...   pieces used by more than one feature
      icons/              YouTube and Instagram brand icons
      ui/                 shadcn primitives (kebab-case file names), restyled to the tokens
    hooks/                hooks used by more than one feature
    lib/                  pure helpers: settings, format, URL cleaners, qualities, pages, commands, media context, folder picker, cn
  tests/                  Vitest tests, same folders as src/
```

Imports across folders use the `@/` alias (`@/services/api`). Imports inside one folder use `./`. Shared API types come from `@shared/<file>.ts`, which points at `../shared/types/`.

## Component tree

```
main.tsx
  StrictMode
    ThemeProvider                      next-themes, class attribute, system theme by default
      TooltipProvider                  one tooltip delay (300 ms) for the whole app
        App                            useToolStatus decides what renders
          (nothing)                    while the first tool check runs
          SetupScreen                  features/setup, when yt-dlp or FFmpeg is missing
          AppShell
            SidebarProvider
              AppSidebar               lockup, Download and Tools groups, InstagramAccountsSection, ThemeSwitcher, Settings
              SidebarInset
                TopBar                 breadcrumb, search trigger with the shortcut, New search
                TranscribePage         page === 'transcribe'
                SettingsPage           page === 'settings'
                BatchPage              page === 'batch', with BatchResultsView
                DownloadPage           page === 'youtube' or 'instagram'
                  before a lookup      LandingHero, UrlForm, ProfileFetchProgress, DownloadSettingsPanel,
                                       YtdlpAlert, ResumeDownloadsBanner, QuickActions, SupportedLinks
                  after a lookup       UrlForm, MediaResult
            DownloadDialog             ProgressModal, while a download is active
            CommandPalette             while the palette is open
            InstagramLoginModal        while the login dialog is open
            UpdateDialog               when Electron's updater reports a new version
        Toaster                        Sonner, bottom right, follows the theme
```

`App` shows nothing while `useToolStatus` reads `GET /api/v1/tools?ids=ytdlp,ffmpeg`. If either tool is missing, it shows `SetupScreen`, which installs yt-dlp and then FFmpeg. If the backend cannot be reached, `App` shows the app anyway, and a failing download then explains the problem.

The sidebar shows `InstagramAccountsSection` on the Instagram and Batch download pages only, and hides it when the sidebar is collapsed to icons. The top bar's breadcrumb shows the page name, then what the page shows after a lookup (`lib/mediaContext.ts`): "Video", "Shorts", the channel name, the playlist title, the post type or `@username`.

### What a lookup shows

`MediaResult` picks one view for each media kind:

| Media | View | What it shows |
|---|---|---|
| Video or Short | `features/youtube/VideoView.tsx` | `VideoPreview` beside `VideoDownloadPanel`, a settings column with the video or MP3 choice, `QualityOptions` and the transcribe toggle |
| Channel | `features/youtube/ChannelView.tsx` | `CollectionHeader` and underline tabs: Videos, Shorts, Live and Playlists |
| Playlist | `features/youtube/PlaylistView.tsx` | `CollectionHeader` with the owner, the count and how many videos YouTube hides, then `VideoCollection` |
| Instagram post, reel or story | `features/instagram/InstagramPostView.tsx` | The post and its download choices |
| Instagram profile | `features/instagram/InstagramProfileView.tsx` | The profile header and a selectable grid of posts |

Each channel tab is its own yt-dlp listing. Switching tabs calls `openLink` with `https://www.youtube.com/<channelPath>/<tab>`. The last tab stays on screen with a `LoadingState` while the next one loads. The Playlists tab shows `PlaylistGrid`, and opening a playlist from it loads that playlist's link.

`VideoCollection` is the list that channel tabs and playlists share. It has a `SearchField`, `FilterChips` (All, Selected, and Not downloadable when some entries are), one `VideoEntryRow` per entry and a `SelectionBar` that sticks to the bottom of the list. The rules live in `collectionFilters.ts`:

- Every entry has a `status`: `available`, `upcoming`, `live` or `unavailable`. Only `available` entries can be selected or downloaded. The others show a status badge and a disabled checkbox.
- With nothing ticked, the selection bar offers every downloadable entry the search and filter show.

## Where state lives

There is no global store and no React context of kinetube's own. The providers are next-themes' `ThemeProvider`, Base UI's `TooltipProvider` and shadcn's `SidebarProvider`. State lives in hooks. `AppShell` calls the app-wide hooks and passes their results down as props.

`AppShell` keeps these values in its own `useState`: the current page, the link in the link field, whether the login dialog is open, and this session's copy of the download settings.

| Hook | File | Owns |
|---|---|---|
| `useToolStatus` | `hooks/` | The startup check, the yt-dlp tool record, whether FFmpeg is installed. |
| `useInstagramAccounts` | `hooks/` | The saved accounts and the account chosen in the sidebar. |
| `useMediaLookup` | `hooks/` | The media found for a link, loading, error, and Instagram profile progress. A newer lookup drops the answer to an older one. |
| `useAppCommands` | `hooks/` | The command palette's open state, its keyboard shortcut, and what each command does. |
| `useHoldToConfirm` | `hooks/` | The hold progress of a `HoldToConfirmButton`. |
| `useUpdateNotice` | `hooks/` | The version Electron's updater found, which opens `UpdateDialog`. |
| `useIdSet` | `hooks/` | A set of ticked ids, such as selected videos. |
| `useIsMobile` | `hooks/use-mobile.ts` | shadcn's mobile check for the sidebar. |
| `useBatch` | `features/batch/` | The pasted links and the lookup result for each one. `AppShell` calls it, so the results stay while the person visits another page. |
| `useDownloadSession` | `features/downloads/` | Joins the three hooks below and adds the chosen Instagram account to every request. |
| `useActiveDownload` | `features/downloads/` | The one download shown in the progress dialog, and its stream. |
| `useResumableDownloads` | `features/downloads/` | Paused and interrupted downloads for the resume banner, and the undo toast when one is dismissed. |
| `usePostDownloadTranscription` | `features/downloads/` | The transcript made after a download finishes. |
| `useToolSetup` | `features/setup/` | Install progress for yt-dlp and FFmpeg on the setup screen. |
| `useTranscribeQueue`, `useWhisperModels`, `useWhisperSetup` | `features/transcribe/` | The file queue, the model list and downloads, the whisper.cpp install. |
| `useInstagramLogin`, `useInstaloaderSetup` | `features/instagram/` | Login with two-factor codes, and the Python and instaloader check. |
| `useAppUpdateCheck`, `useYtdlpUpdate` | `features/settings/` | The app version and manual update check, and the yt-dlp update check, on the About section. |

Pages that need nothing from the rest of the app, such as `TranscribePage` and `SettingsPage`, call their own hooks.

## Styling

### Tokens

`styles/tokens.css` defines every colour, radius, shadow, layout size and motion value as a CSS variable. Light values sit under `:root` and dark values under `.dark`. Each one traces back to a row in `docs/design-reference.md`. The same file points shadcn's variable names (`--background`, `--primary`, `--border` and the rest) at the tokens, so every primitive in `components/ui/` follows them.

`index.css` maps the tokens into Tailwind under `@theme inline`:

| Kind | Classes |
|---|---|
| Colours | `bg-app`, `bg-surface`, `bg-surface-elevated`, `bg-surface-hover`, `text-ink`, `text-ink-muted`, `text-ink-faint`, `bg-spin`, `text-spin-text`, `border-line`, `border-divider`, and a plain and `-soft` class for each state colour (`success`, `warning`, `error`, `info`) |
| Radii | `rounded-row`, `rounded-control`, `rounded-card`, `rounded-choice`, `rounded-dialog`, `rounded-pill` |
| Shadows | `shadow-popover`, `shadow-dialog`, `shadow-bar`, only for layers that float |
| Fonts | `font-sans` (DM Sans) for text, `font-display` (Unbounded) for page titles and the wordmark |
| Motion | `animate-spin-once` for the brand mark, `animate-fade-in`, and the `--motion-ease` and `--duration-*` variables |

It also adds these utilities:

| Utility | Use |
|---|---|
| `text-hero` | The landing heading: Unbounded, 30 px |
| `text-page-title` | A page title: Unbounded, 24 px |
| `text-section` | A section or card title: 16 px, weight 600 |
| `text-label` | A small uppercase label: 12 px, spaced |
| `transition-quiet` | Colour, background, border, shadow, opacity and transform transitions at the fast duration and the brand ease |
| `scrollbar-quiet` | A thin scrollbar that darkens on hover, for popups and long lists |

Layout sizes are variables too: `--topbar-height` (52 px), `--content-max` (1152 px), `--content-narrow` (760 px) and `--panel-width` (360 px). Use them as `max-w-[var(--content-narrow)]`.

The base layer gives every interactive element the same 2 px `--focus` ring. With reduced motion turned on, every animation and transition is cut to 1 ms.

Components use token classes only. There are no palette classes such as `bg-red-500` and no hex colours in `src/`. The one exception is `electron/loading.html`, which copies the dark token values because it loads from disk before the bundle exists.

### Dark mode

next-themes puts the `dark` class on `<html>`, and `index.css` declares `@custom-variant dark (&:is(.dark *))`. next-themes stores the theme on its own, apart from the saved settings. The sidebar's `ThemeSwitcher`, the Appearance section in Settings and the command palette all set it, and it applies at once with no Save.

### Merging class names

`cn()` in `lib/utils.ts` runs `clsx`, then `tailwind-merge`. The tokens add font sizes, radii and shadows that `tailwind-merge` does not know. Without help it would treat `text-page-title` as a colour and drop it next to `text-ink`. So `cn()` uses `extendTailwindMerge` and registers them:

```ts
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'page-title', 'section', 'label'],
      radius: ['row', 'control', 'card', 'choice', 'dialog', 'pill'],
      shadow: ['popover', 'dialog', 'bar'],
    },
  },
});
```

When you add a font size, radius or shadow token, add its name here in the same change.

### Brand assets

`components/shell/BrandMark.tsx` imports the 96 px ink and white marks from `assets/brand/` and lets CSS pick one per theme, so there is no flash on load. `BrandLockup` sets the mark beside the lowercase `kinetube` wordmark in Unbounded. The full-size files stay in `frontend/public/kinetube-brand-kit/`.

## Patterns

`components/patterns/` holds the page patterns from the design reference. Use one of them before you write new markup for the same job.

| Pattern | Use |
|---|---|
| `PageHeader` | A page title with its description and actions |
| `SectionHeader` | A section title with a description and actions |
| `SurfaceBox` | One flat raised area, separated by tone instead of a shadow |
| `MetricBox` | A label and a number, tinted by tone |
| `ListRow` | A selectable row with a leading control, media, title, metadata and trailing actions |
| `DetailPanel` | The settings column beside a working surface, sticky under the top bar on wide windows |
| `SearchField` | A labelled search input |
| `FilterChips` | Pill chips with counts, as one radio group |
| `ChoiceCard` | A large option tile that starts a flow |
| `StatusBadge` | A small pill in a tone |
| `Notice` | An inline callout tinted by its tone |
| `MediaThumbnail` | A thumbnail that keeps its aspect ratio, with an optional duration and badge |
| `Kbd` | A keyboard key |
| `CollectionHeader` | The header of a channel, playlist or profile: image, title and facts |
| `ConfirmDialog` | A dialog that asks before an action. With `isDestructive` its confirm button is a `HoldToConfirmButton`. |
| `HoldToConfirmButton` | A button that runs its action only after a press and hold |
| `EmptyState`, `LoadingState`, `ErrorState` | What a list or page shows when it has nothing, is loading, or failed |

`components/ui/` holds the shadcn primitives, restyled to the tokens. The select primitive sets `alignItemWithTrigger` to `false`, so its popup opens beside its field instead of covering it. The popup fades and scales in and out through Base UI's `data-starting-style` and `data-ending-style` attributes.

## The command palette

The palette opens with Ctrl and K (Cmd and K on macOS) on any page, and from the search trigger in the top bar. The same shortcut closes it.

- `hooks/useAppCommands.ts` owns the open state and listens for the shortcut on `window`. It also runs each command.
- `lib/commands.ts` lists the commands: fetch the link on the clipboard, go to each page, and the three theme choices. `filterCommands(query, isLink)` keeps the commands whose label or keywords contain every typed word, in any order. A pasted link turns into one "Fetch <link>" command, so Enter fetches it at once.
- `components/shell/CommandPalette.tsx` is a dialog with a combobox input and a listbox. The arrow keys move the highlight, Enter runs the highlighted command, and running a command closes the palette.

A page command calls `changePage`. A theme command calls next-themes' `setTheme`. A fetch command calls `openLink` in `AppShell`, which picks the YouTube or Instagram page from the link and looks it up. The clipboard command reads the clipboard and fetches the link it finds. The landing's "Paste and fetch" quick action runs the same code.

## Toasts

`main.tsx` mounts one Sonner `<Toaster position="bottom-right" />`. The wrapper in `components/ui/sonner.tsx` passes it the current theme. Call `toast`, `toast.success` or `toast.error` from `sonner`.

| Where | Toast |
|---|---|
| `SettingsPage` | "Settings saved" |
| `TranscriptPanel`, `QueueItemCard` | "Transcript copied", or an error that says to select and copy the text instead |
| `AppShell` | "Logged in as @username" after an Instagram login |
| `useAppCommands` | An error when the clipboard has no YouTube or Instagram link, or cannot be read |
| `useResumableDownloads` | "Removed from unfinished downloads", with an Undo action |

Dismissing an unfinished download removes it from the banner at once. The backend record is deleted only when the toast closes without Undo. Undo puts the download back in the list. The partial file stays on disk either way.

Toasts are for short-lived results. An error that belongs to a field or a page, such as a link that can't be read, stays inline next to it.

## Destructive actions

A destructive action asks for a press and hold instead of a click. `HoldToConfirmButton` fills a bar while the person holds it with the mouse, touch, Space or Enter. When the bar is full (1.2 seconds by default), the action runs. Letting go, moving off the button or losing focus cancels it. A plain click never runs the action. Its accessible name is the label followed by "Press and hold to confirm."

Two places use it today:

- Removing an Instagram account: `InstagramAccountsSection` opens a `ConfirmDialog` with `isDestructive`, whose button reads "Hold to remove".
- Clearing the transcription queue: "Hold to clear" on the Transcribe page, shown when the queue has items and is not running.

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
- `saveSettings()` writes the whole object. Only `SettingsPage` calls it, and it shows the "Settings saved" toast.
- `AppShell` keeps a per-session copy of the download preferences (`DownloadSettings`, with a numbering start). The download options sheet (`DownloadSettingsPanel`) changes that copy. Saving in Settings replaces it but keeps the numbering start the person typed.
- `toFileNameOptions()` turns the settings into the `fileName` object each download request sends.

The backend never reads these settings. Each request carries the values it needs.

## The app version

`vite.config.ts` reads the version from the root `package.json` and defines it as `__APP_VERSION__`. The About section in Settings shows the version Electron reports through `getAppVersion`, and falls back to `__APP_VERSION__` in a plain browser. Both come from the same root `package.json`.

## shadcn on Base UI

The shadcn primitives in `components/ui/` use the `base-nova` style (`components.json`), built on `@base-ui/react`, not Radix. To render a primitive as another element, pass that element in the `render` prop. There is no `asChild`.

```tsx
<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Download ${video.title}`} title="Download this one" />}>
```

The files in `components/ui/` are generated, then restyled to the tokens. They keep shadcn's own formatting and kebab-case names. Add a primitive with the shadcn CLI instead of writing it by hand, then swap its colours for token classes.

## The Electron bridge

`window.electronAPI` is typed in `vite-env.d.ts` as optional `ElectronApi` from `shared/types/electron.ts`. It is missing when the frontend runs in a plain browser, so every call checks it: `window.electronAPI?.onUpdateStatus(...)`. See `docs/architecture/electron/MAIN_PROCESS.md` for the channels.

## Tests

Tests live in `frontend/tests/`, in the same folders as the code they test (`tests/features/downloads/` for `src/features/downloads/`). Vitest runs every `tests/**/*.test.{ts,tsx}` file in jsdom. `tests/setup.ts` runs Testing Library's `cleanup` after each test, because Vitest globals are off. It also gives jsdom a `matchMedia` that answers "light", because next-themes asks for the system theme.

- Reducers, helpers and the stream reader have unit tests: `downloadState.test.ts`, `toolSetupState.test.ts`, `transcribeQueueState.test.ts`, `batchResults.test.ts`, `collectionFilters.test.ts`, `commands.test.ts`, `qualities.test.ts`, `urlCleaners.test.ts`, `format.test.ts`, `settings.test.ts`, `fileNamePreview.test.ts`, `eventStream.test.ts` and `request.test.ts`.
- `ProgressModal`, `ResumeDownloadsBanner`, `HoldToConfirmButton`, `CommandPalette` and `AppearanceSection` have component tests with Testing Library.

Run them with `npm test` in `frontend/`, or `npm test` at the root for the backend and frontend together. `docs/workflows/TESTING.md` lists what each file covers.

## Adding a page

1. Add the page id to `Page` and `PAGE_LABELS` in `lib/pages.ts`.
2. Create the page component in its feature folder, for example `features/<feature>/<Name>Page.tsx`, with its own hooks. Start it with `PageHeader` and build it from the patterns.
3. Render it in `AppShell` for its page id, add it to `NAV_GROUPS` in `components/shell/AppSidebar.tsx`, and add a "Go to" command in `lib/commands.ts`.
4. Add any backend calls as methods on `api` in `services/api.ts`, typed from `shared/types/`.
5. If the page reads a stream, put the event handling in a pure `*State.ts` reducer and test it.
6. Check the page against `docs/design-reference.md` in the light and dark themes, at 1440 px and at 960 px.
7. Update the folder layout and component tree in this file.
