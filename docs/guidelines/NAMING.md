# Naming Conventions

## Files

| Location | Convention | Examples |
|---|---|---|
| Backend routes | `camelCase.js` | `download.js`, `transcribe.js`, `instagram.js` |
| Backend utils/managers | `camelCase.js` | `ytdlpManager.js`, `whisperManager.js`, `paths.js` |
| Electron main/preload | `camelCase.js` | `main.js`, `preload.js` |
| Frontend components | `PascalCase.jsx` | `VideoView.jsx`, `SettingsPage.jsx` |
| Frontend hooks | `use-kebab-case.js` | `use-mobile.js` |
| Frontend utilities | `camelCase.js` | `utils.js` |
| shadcn components | `kebab-case.jsx` | `button.jsx`, `dialog.jsx` (generated - do not rename) |
| Backend tests | `camelCase.test.js` | `urlParser.test.js` |
| Documentation | `SCREAMING_SNAKE_CASE.md` | `OVERVIEW.md`, `JAVASCRIPT.md` |

## Functions

- Backend route handlers: inline arrow functions passed to `router.METHOD()`, named only when extracted for reuse
- Backend manager functions: `camelCase` verb + noun - `getYtdlpPath()`, `ensureWhisper()`, `checkYtdlpStatus()`, `transcribeFile()`
- Backend parser functions: `parseX` - `parseYouTubeUrl()`, `parseInstagramUrl()`
- Frontend fetch helpers: `verb` + noun - `fetchInfo()`, `fetchYtdlpStatus()`
- React event handlers: `handle` + PascalCase noun/event - `handlePaste()`, `handleDownloadClick()`
- React custom hooks: `use` + PascalCase noun - `useIsMobile()`

## Variables

- `camelCase` throughout - `downloadsDir`, `modelName`, `whisperExe`
- Boolean variables: `is`/`has`/`can` prefix - `isReady`, `hasError`, `canDownload`
- Paths: `{thing}Path` or `{thing}Dir` suffix - `ytdlpPath`, `downloadsDir`, `modelsDir`
- Progress payloads: `{noun}` matching the SSE event shape - `phase`, `progress`, `percent`, `speed`

## Constants

- True module-level constants: `SCREAMING_SNAKE_CASE` - `YTDLP_VERSION`, `WHISPER_ZIP_URL`, `DOWNLOADS_DIR`, `MODELS`
- Grouped constants: prefer an object (e.g. `MODELS` in `whisperManager.js`, mapping model key to `{ label, file, sizeMB }`) over multiple loose constants

## SSE Event Names

- `phase` - a discrete step changed (`downloading`, `extracting`, `transcribing`, `done`, `error`)
- `progress` - a numeric update within a phase (`percent`, `downloaded`, `total`, `speed`)
- `chunk` - streamed partial output (used by transcription to stream text as it's produced)
- `done` / `error` - terminal events

## IPC Channels (Electron)

- `kebab-case` - `open-folder-dialog`, `update-status`, `download-update`, `install-update`

## Environment Variables

- `SCREAMING_SNAKE_CASE`, prefixed `ELECTRON_` when injected by the main process into the backend child process - `ELECTRON_APP`, `ELECTRON_USER_DATA`, `ELECTRON_FRONTEND_DIST`
