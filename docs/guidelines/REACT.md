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

Event handlers declared inside a component are named `handle<Event>` (`handleSave`, `handleSubmit`) or after what they do (`clearSearch`, `toggleBatch`).

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

Other examples: `TONE_LABELS` in `features/setup/ToolRow.tsx`, `APP_UPDATE_HINTS` in `features/settings/useAppUpdateCheck.ts`, `PLACEHOLDERS` in `pages/download/UrlForm.tsx`. The copy itself follows `docs/WRITING_STANDARDS.md`.

## Accessibility

- Every form field has a label. Use `<Label htmlFor>` when the label is visible. Use `aria-label` when it is not, as `<Textarea aria-label="Links to download">` and `<SelectTrigger aria-label="Quality">` do.
- Every button that shows only an icon has an `aria-label` that names the action and its target: ``aria-label={`Remove @${username}`}``.
- Every `<button>` and `<Button>` sets `type`. Use `type="submit"` only for the button that submits a form (`UrlForm`, `LoginForm`, `TwoFactorForm`), and `type="button"` everywhere else.
- A button that opens and closes a section sets `aria-expanded`, as in `CollectionResultCard.tsx`.
- Use `<button>` for actions and `<a>` for links. Every `<img>` has `alt`: an empty string for decoration, real text for a thumbnail.
- Use the shadcn primitives for dialogs, menus, selects and tabs. They handle focus and ARIA attributes. Do not build an interactive `<div>`.

## Performance

- Use `useMemo` only when a computation is costly, such as filtering a channel or profile grid (`ChannelView.tsx`, `InstagramProfileView.tsx`).
- Use `useCallback` for functions a hook returns or passes to effects, so their identity stays stable.
- Large grids (`ChannelView.tsx`, `InstagramProfileView.tsx`) should page or virtualize before they get more work per item.

## Electron-aware components

`window.electronAPI` is missing when the frontend runs in a plain browser, for example with `npm run dev` in `frontend/` alone. Every call checks it first: `window.electronAPI?.installUpdate()`. See `docs/architecture/frontend/REACT_ARCHITECTURE.md`.
