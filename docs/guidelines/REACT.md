# React Standards

## Component Rules

**Function components only.** No class components.

**One component per file**, matching the filename (`VideoView.jsx` exports `VideoView`).

**No PropTypes, no TypeScript.** Descriptive prop names are the documentation, matching the rest of the project.

## Hooks

Use hooks at the top level only - never inside conditions or loops. `frontend/src/hooks/use-mobile.js` is the pattern for a custom hook: a single `useIsMobile()` export, `use-kebab-case.js` filename.

## State Management

There is no global store or Context provider beyond `ThemeProvider` (next-themes). See `docs/architecture/frontend/REACT_ARCHITECTURE.md` for the full rationale. Default to local `useState` in the component/page that needs the data. Lift state to `App.jsx` only when more than one sibling view genuinely needs it (e.g. the current parsed-URL result, which both the video/channel views and the progress modal need).

## Data Fetching Pattern

Request/response calls follow this shape (from `App.jsx`):

```jsx
async function fetchInfo(url) {
    const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch info');
    return data;
}
```

Streaming (SSE) calls follow the `phase`/`progress`/`done`/`error` event pattern documented in `docs/guidelines/ERROR_HANDLING.md`. `ProgressModal.jsx` is the canonical consumer - drive new long-running operations through it rather than writing a second stream parser.

## JSX Rules

**Conditional rendering:**
```jsx
{loading ? <Spinner /> : <VideoView data={data} />}
{error && <YtdlpAlert message={error} />}
```

**Lists always need `key`:**
```jsx
{formats.map((f) => <FormatRow key={f.format_id} format={f} />)}
```

**Event handlers** are named `handle{Event}`:
```jsx
function handlePaste(e) { ... }
function handleDownloadClick() { ... }
```

## Accessibility

- All interactive elements must be keyboard-accessible
- `<button>` for actions, `<a>` for navigation/external links
- Images need `alt` attributes (empty string for decorative images, meaningful text for thumbnails)
- shadcn components handle most ARIA attributes automatically - use them as provided rather than building raw `<div>` interactive elements

## Performance

- Avoid expensive computations in render; use `useMemo` if a computation is genuinely costly (e.g. filtering a large channel video grid)
- Avoid re-creating callback props on every render where it causes a measurable re-render cost in a large list (`useCallback`)
- Large video/media grids (`ChannelView.jsx`, `InstagramProfileView.jsx`) should paginate or virtualize before adding more per-item work, not after

## Electron-Aware Components

Any component calling `window.electronAPI` must guard against it being undefined (the frontend can be loaded standalone via `vite preview` outside Electron during development). See `docs/architecture/frontend/REACT_ARCHITECTURE.md` - Electron Bridge.
