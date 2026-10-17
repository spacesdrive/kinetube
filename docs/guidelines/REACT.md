# React standards

These rules describe how the frontend in `frontend/src/` is written today. They sit on top of `docs/guidelines/TYPESCRIPT.md`.

## Components

- Function components only. No class components.
- **One exported component per file**, as the default export, with the same name as the file: `VideoView.tsx` has `export default function VideoView`. A small helper component used only inside that file can stay unexported there, like `ActionLabel` in `UpdateDialog.tsx`.
- Current exceptions: `components/icons/BrandIcons.tsx` exports `YouTubeIcon` and `InstagramIcon`, `features/batch/BatchStatusCards.tsx` exports `WaitingCard` and `ErrorCard`, and `ThemeProvider.tsx` uses a named export. The shadcn files in `components/ui/` export several parts each.
- Keep components about rendering. State, effects and requests go in hooks.

### Props

Each component has an exported `<Component>Props` interface right above it. Props are destructured in the parameter list.

```tsx
export interface UpdateDialogProps {
  version: string;
  onDismiss(): void;
}

export default function UpdateDialog({ version, onDismiss }: UpdateDialogProps) {
```

- Callback props are named `on<Event>` and written as method signatures: `onDismiss(): void;`.
- A props interface can extend a shared one, as `DownloadPageProps extends MediaDownloadHandlers` does.
- When a component takes a whole hook result, type it with `ReturnType<typeof useX>` or the type the hook file exports (`MediaLookup`, `BatchState`).

Event handlers declared inside a component are named `handle<Event>` (`handleSave`, `handleSubmit`) or after what they do (`clearSearch`, `downloadAll`).

## Hooks

- Put state and effects in a `use<Name>` hook. A hook used by one feature lives in that feature's folder (`features/downloads/useActiveDownload.ts`). A hook used by more than one feature lives in `src/hooks/`.
- Return a plain object from a hook. Functions in it that are passed down or used in effects are wrapped in `useCallback`.
- Call hooks at the top level only. The lint rule `react-hooks/rules-of-hooks` enforces it.
- Drop answers that arrive too late. An effect sets an `isCurrent` flag and clears it in its cleanup (`useToolStatus`, `useResumableDownloads`). A lookup that can be repeated counts its calls in a ref and ignores older answers (`useMediaLookup`).
- An effect that subscribes returns the unsubscribe function: `return window.electronAPI?.onUpdateStatus(...)`.
- A handler that lives longer than one render reads the newest callback through a ref. Update the ref in an effect, never during render (`onFileSavedRef` in `useActiveDownload`).
- StrictMode runs effects twice in development. Guard a one-time side effect with a ref, as `hasStartedRef` in `useToolSetup` does, so setup never sends two install requests.

### No state set synchronously in effects

Do not call a state setter directly in an effect body. It forces an extra render. The `react-hooks/set-state-in-effect` rule in the recommended config reports it.

- Work out values during render instead of copying them into state with an effect: `const canClose = phase !== 'downloading';`.
- Set state from event handlers, from the result of a promise, or from a subscription callback.
- Reset state in the handler that causes the change, as `changePage` in `AppShell` clears the link and the lookup.

## State updates

- State updaters must be pure. StrictMode calls them twice in development, so a side effect inside one runs twice.
- Start requests and call parent callbacks outside the updater, before it:

```ts
replaceStream(open((...event) => {
  // side effects stay outside the state updater, which StrictMode runs twice
  const [name, data] = event;
  if (name === 'done' && data.success && data.filePath && shouldTranscribe) onFileSavedRef.current(data.filePath, false);
  setActive((previous) => (previous?.kind === 'single' ? applyDownloadEvent(previous, ...event) : previous));
}));
```

- Use the function form (`setItems((previous) => ...)`) when the next state depends on the current one.
- Stream events become state through a pure reducer in a `*State.ts` file. See `docs/architecture/frontend/REACT_ARCHITECTURE.md`.

## Data fetching

Components and hooks call `api` from `@/services/api`, never `fetch` (ADR-027). A plain request returns `{ data }` or `{ data, total }` and throws an `ApiError` with the backend's message:

```ts
const { data } = await api.getYouTubeMedia(cleanYouTubeUrl(url));
```

A stream takes a handler and returns a handle. Keep the handle so the stream can be closed:

```ts
const stream = api.installTool(toolId, (...event) => {
  setTools((previous) => ({ ...previous, [toolId]: applyToolEvent(previous[toolId], ...event) }));
});
await stream.finished;
```

Show `error.message` from a failed request, or `message` from a failed `done` event. Both are written for the person reading them.

## JSX

- Use `&&` to show or hide one thing, and one ternary to choose between two things.
- **No nested ternaries.** Use an early return, a lookup table, a helper function such as `descriptionFor` in `UpdateDialog.tsx`, or a small helper component such as `ActionLabel`. `MediaResult.tsx` picks the view for each media kind with early returns.
- Every list item has a `key` taken from the data, such as a URL, a username or an id. Not the array index.

### Typed copy tables

Fixed text for each state goes in a table typed by that state, so the compiler flags a state with no text:

```tsx
const TITLES: Record<UpdatePhase, string> = {
  available: 'Update available',
  downloading: 'Downloading the update',
  downloaded: 'Update ready',
  error: "The update didn't download",
};
```

Other examples: `TONE_BADGES` in `features/setup/ToolRow.tsx`, `STATUS_LABELS` in `features/youtube/collectionFilters.ts`, `APP_UPDATE_HINTS` in `features/settings/useAppUpdateCheck.ts`, `PLACEHOLDERS` in `pages/download/UrlForm.tsx`. The copy itself follows `docs/WRITING_STANDARDS.md`.

## Styling

Every visual value comes from `docs/design-reference.md` through the tokens in `frontend/src/styles/tokens.css`. See "Styling" in `docs/architecture/frontend/REACT_ARCHITECTURE.md` for the full list.

- Use token classes: `bg-app`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `rounded-control`, `rounded-card`, `shadow-popover`. Never a Tailwind palette class such as `bg-zinc-800` or `text-red-500`, and never a hex colour in a component. Both break the dark theme.
- State colours have a plain and a soft token: `text-error` on `bg-error-soft`, `text-success` on `bg-success-soft`. Use `StatusBadge` or `Notice` instead of mixing them by hand.
- The accent (`spin`) marks the one primary action per view, the active navigation icon, selection and progress. Keep it to that.
- Use the type utilities for headings: `text-page-title`, `text-section`, `text-label`, and `text-hero` on the landing. Body text needs no class.
- Use `transition-quiet` for hover and focus changes, and `scrollbar-quiet` for a scrolling popup or list.
- Use the layout variables for widths: `max-w-[var(--content-narrow)]`, `lg:grid-cols-[minmax(0,1fr)_var(--panel-width)]`.
- Join class names with `cn()` from `@/lib/utils`. When you add a font size, radius or shadow token, register it in the `extendTailwindMerge` call in `lib/utils.ts`, or `cn()` will drop it.
- Shadows only go on layers that float: popovers, dialogs and the selection bar. Surfaces on the page are separated by tone.

## Patterns before new markup

`frontend/src/components/patterns/` has the building blocks of every page: `PageHeader`, `SectionHeader`, `SurfaceBox`, `MetricBox`, `ListRow`, `DetailPanel`, `SearchField`, `FilterChips`, `ChoiceCard`, `StatusBadge`, `Notice`, `MediaThumbnail`, `Kbd`, `CollectionHeader`, `ConfirmDialog`, `HoldToConfirmButton`, `EmptyState`, `LoadingState` and `ErrorState`.

- Look for a pattern before you write markup for a header, a row, a status pill, a callout or an empty, loading or error state.
- If a pattern almost fits, extend it with a prop instead of copying its markup into a feature.
- A new pattern goes in `components/patterns/` only when a second feature needs it. Add it to the patterns table in `REACT_ARCHITECTURE.md`.
- The app shell (sidebar, top bar, brand mark, theme switcher, command palette) lives in `components/shell/`. Features do not add their own copies of it.

## Feedback

- Show a short-lived result as a Sonner toast: `toast.success('Settings saved', { description: '...' })`. The `<Toaster>` is mounted once in `main.tsx`, so a component only imports `toast` from `sonner`.
- A removal that is easy to take back gets a toast with an Undo action, as `useResumableDownloads().dismiss` does. Do the real work only when the toast closes without Undo.
- An error that belongs to a field or a page stays inline, next to what failed: the link form, a queue item, a batch result card. Use a toast for an error only when there is no place on the screen for it, such as a clipboard read.
- Never use `alert()` or a custom banner for short-lived feedback.

## Destructive actions

- An action that deletes something the person can't get back (a saved login, the transcription queue) uses `HoldToConfirmButton`, alone or inside `ConfirmDialog` with `isDestructive`.
- The label says what the hold does: "Hold to remove", "Hold to clear".
- A plain "Confirm" click is not enough for these. The hold is the confirmation, so a `ConfirmDialog` for a destructive action always sets `isDestructive`.
- A removal that is easy to take back, such as dismissing an unfinished download, needs no hold. It gets an Undo toast instead.

## Accessibility

- Every form field has a label. Use `<Label htmlFor>` when the label is visible. Use `aria-label` when it is not, as `<Textarea aria-label="Links to download">` and `<SelectTrigger aria-label="Quality">` do.
- Every button that shows only an icon has an `aria-label` that names the action and its target: ``aria-label={`Remove @${username}`}``, ``aria-label={`Download ${video.title}`}``. Add a `title` or the sidebar's `tooltip` too, so the name shows on hover.
- A decorative icon next to text gets `aria-hidden="true"`.
- Every `<button>` and `<Button>` sets `type`. Use `type="submit"` only for the button that submits a form (`UrlForm`, `LoginForm`, `TwoFactorForm`), and `type="button"` everywhere else.
- A button that opens and closes a section sets `aria-expanded`, as in `CollectionResultCard.tsx`.
- Use `<button>` for actions and `<a>` for links. Every `<img>` has `alt`: an empty string for decoration, real text for a thumbnail.
- Use the shadcn primitives for dialogs, menus, selects and tabs. They handle focus and ARIA attributes. Do not build an interactive `<div>`.

## Performance

- Use `useMemo` only when a computation is costly, such as filtering a long video list or profile grid (`VideoCollection.tsx`, `InstagramProfileView.tsx`).
- Use `useCallback` for functions a hook returns or passes to effects, so their identity stays stable.
- Long lists (`VideoCollection.tsx`, `InstagramProfileView.tsx`) should page or virtualize before they get more work per item.

## Electron-aware components

`window.electronAPI` is missing when the frontend runs in a plain browser, for example with `npm run dev` in `frontend/` alone. Every call checks it first: `window.electronAPI?.installUpdate()`. See `docs/architecture/frontend/REACT_ARCHITECTURE.md`.
