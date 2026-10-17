# Naming conventions

## Files

| Location | Convention | Examples |
|---|---|---|
| Backend layer files | `<feature><Layer>.ts` | `downloadRoutes.ts`, `downloadController.ts`, `downloadValidators.ts`, `downloadService.ts`, `pendingDownloadStore.ts` |
| Backend managers | `managers/<tool>/<tool>Manager.ts`, helpers named `<tool><Part>.ts` | `ytdlp/ytdlpManager.ts`, `ytdlp/ytdlpArgs.ts`, `whisper/whisperModels.ts` |
| Backend service helpers | a folder named after the feature, `camelCase.ts` inside | `services/downloads/downloadRunner.ts`, `services/instagram/profileScraper.ts` |
| Backend platform parsers | `platforms/<platform>/<platform><Part>.ts` | `youtube/youtubeUrl.ts`, `instagram/instagramMetadata.ts` |
| Backend `lib/` and `middleware/` | `camelCase.ts` | `runProcess.ts`, `httpDownload.ts`, `originGuard.ts`, `errorHandler.ts` |
| Python helpers | `snake_case.py` | `instaloader_login.py`, `instaloader_profile.py` |
| Shared types | one lowercase file per resource | `downloads.ts`, `tools.ts`, `electron.ts` |
| Electron | `camelCase.ts` | `main.ts`, `backendProcess.ts`, `mainWindow.ts` |
| Scripts | `kebab-case.mts` | `patch-7zip.mts`, `run-electron.mts` |
| React components | `PascalCase.tsx`, named after the default export | `VideoView.tsx`, `ProgressModal.tsx`, `SettingsPage.tsx` |
| React hooks | `use<Name>.ts` | `useActiveDownload.ts`, `useToolStatus.ts` |
| Stream reducers | `<thing>State.ts` | `singleDownloadState.ts`, `toolSetupState.ts` |
| Frontend helpers | `camelCase.ts` | `settings.ts`, `urlCleaners.ts`, `eventStream.ts` |
| shadcn primitives | `kebab-case.tsx` (generated, do not rename) | `button.tsx`, `dropdown-menu.tsx`, `use-mobile.ts` |
| Tests | `<file under test>.test.ts` or `.test.tsx`, in the same folders as the source | `tests/managers/ytdlp/ytdlpArgs.test.ts`, `tests/features/downloads/ProgressModal.test.tsx` |
| Documentation | `SCREAMING_SNAKE_CASE.md` | `OVERVIEW.md`, `TYPESCRIPT.md` |

Two test files cover a group rather than one file: `backend/tests/routes/apiRoutes.test.ts` tests every route through `createApp`, and `frontend/tests/features/downloads/downloadState.test.ts` tests both download reducers.

React file names also say what kind of component they hold: `<Name>Page`, `<Name>View`, `<Name>Card`, `<Name>Panel`, and `<Name>Dialog` or `<Name>Modal` for a dialog.

## Functions

### Backend

| Kind | Pattern | Examples |
|---|---|---|
| Factories | `create<Name><Layer>` | `createDownloadService`, `createDownloadController`, `createDownloadRoutes`, `createYtdlpManager`, `createPendingDownloadStore` |
| Validators | `parse<Thing>`: take `unknown`, return a typed value or throw | `parseCreateDownload`, `parseDownloadId`, `parseToolIds`, `parseTwoFactorCode` |
| URL and output parsers | `parse<Thing>`: return the parsed value, or `null` when it does not match | `parseYouTubeUrl`, `parseInstagramUrl`, `parseDownloadTarget`, `parseYtdlpJson` |
| Builders | `build<Thing>` | `buildDownloadArgs`, `buildFileNameTemplate` |
| Readers | `read<Thing>` | `readConfig`, `readDownloadRecord`, `readJsonArray` |
| Checks | `is<Thing>` | `isRecord`, `isInstagramUsername`, `isAllowedImageHost` |

The factory returns an object typed by an interface with the same name minus `create`: `createDownloadService(): DownloadService`.

Controller methods are named after the action: `list`, `get`, `create`, `pause`, `resume`, `remove`. Service methods use the same words where they fit.

### Frontend

| Kind | Pattern | Examples |
|---|---|---|
| Hooks | `use<Name>` | `useMediaLookup`, `useDownloadSession`, `useIsMobile` |
| Reducers | `apply<Thing>Event`, with `create<Thing>` for the first state | `applyDownloadEvent`, `createSingleDownload`, `applyToolEvent` |
| API client methods | verb plus resource | `api.listTools`, `api.createDownload`, `api.pauseDownload`, `api.removeInstagramAccount` |
| Event handlers in a component | `handle<Event>`, or what the handler does | `handleSave`, `handleSubmit`, `clearSearch`, `toggleBatch` |
| Callback props | `on<Event>` | `onDismiss`, `onDownload`, `onPageChange` |

## Types

| Kind | Pattern | Examples |
|---|---|---|
| Types and interfaces | `PascalCase`, no `I` prefix | `Download`, `ToolService`, `AppConfig` |
| Errors | `<Reason>Error`, extending `AppError` | `ValidationError`, `NotFoundError`, `ConflictError`, `ToolNotInstalledError`, `UpstreamTimeoutError` |
| Error codes | `SCREAMING_SNAKE_CASE` string literals | `VALIDATION_FAILED`, `TOOL_NOT_INSTALLED` |
| Request bodies | `Create<Thing>Request` | `CreateDownloadRequest`, `CreateTranscriptionRequest` |
| Stream event maps | `<Thing>Events` | `DownloadEvents`, `DownloadBatchEvents`, `ToolInstallEvents` |
| One event's data | `<Thing>Event` | `DownloadProgressEvent`, `ToolPhaseEvent`, `WarningEvent` |
| Id unions | `<Thing>Id` | `ToolId`, `WhisperModelId` |
| Props | `<Component>Props` | `UpdateDialogProps`, `DownloadPageProps` |

Use a union of string literals instead of an `enum` (`erasableSyntaxOnly` forbids enums).

## Routes

- Every route sits under `/api/v1`. Only `/health` stays at the root.
- A path names a resource as a plural noun in kebab-case: `/tools`, `/downloads`, `/download-batches`, `/whisper-models`, `/transcriptions`, `/folders`, `/images`.
- A nested resource adds its parent: `/instagram/accounts`, `/youtube/media`, `/instagram/media`.
- Path parameters are `camelCase` and end in `Id` for an id: `:toolId`, `:downloadId`, `:modelId`. Others name the value: `:username`, `:folderPath`.
- An action on a resource is a POST to a verb or noun after its path: `/tools/:toolId/install`, `/downloads/:downloadId/pause`, `/instagram/accounts/:username/two-factor`, `/folders/pick`.
- Query parameters are short `camelCase` words: `ids`, `status`, `url`, `account`.
- Each route table is `routes/<resource>Routes.ts`, built by `create<Resource>Routes`.

## Variables and fields

- `camelCase` for variables and JSON fields: `outputDir`, `fileName`, `sequenceNumber`.
- Booleans start with `is`, `has`, `can`, `should` or `will`: `isInstalled`, `isAudioOnly`, `hasSession`, `canClose`, `shouldTranscribe`, `willMerge`.
- Suffixes say what a value is:
  - `Id` for ids: `downloadId`, `modelId`, `requestId`
  - `At` for ISO timestamps: `startedAt`, `pausedAt`, `addedAt`
  - `Count` for counts: `fetchedCount`, `succeededCount`, `failedCount`
  - `Dir`, `Path` and `File` for paths: `downloadsDir`, `binaryPath`, `accountsFile`
  - a unit for measured numbers: `timeoutMs`, `durationMs`, `totalBytes`, `bytesPerSecond`, `sizeMb`
- A ref ends in `Ref`: `streamRef`, `hasStartedRef`.
- Module-level constants are `SCREAMING_SNAKE_CASE`: `KEEP_ALIVE_MS`, `YTDLP_VERSION`, `DEFAULT_SETTINGS`. A fixed table of values is one object or `Record`, not several loose constants: `MODELS` in `whisperModels.ts`, `TITLES` in `UpdateDialog.tsx`.

## Stream events

Event names are `camelCase` words. Each route's names are in its `<Thing>Events` type in `shared/types/`.

- `phase`: a step started or changed
- `progress`: a number moved within a step
- `log` and `warning`: a line to show the person
- `chunk`: part of a transcript as it is produced
- `start`, `itemStart`, `itemProgress`, `itemDone`: the parts of a download or a batch
- `profile`: an Instagram profile header, before its posts are read
- `paused`: a download stopped and can be resumed
- `done`: always the last event

## IPC channels

`kebab-case`: `open-folder-dialog`, `get-app-version`, `check-for-updates`, `download-update`, `install-update`, `update-status`. The matching `window.electronAPI` methods are `camelCase`: `openFolderDialog`, `onUpdateStatus`.

## Environment variables

`SCREAMING_SNAKE_CASE`. Variables the main process sets for the backend start with `ELECTRON_`: `ELECTRON_APP`, `ELECTRON_USER_DATA`, `ELECTRON_FRONTEND_DIST`. `PORT` is the only other one.

## Test names

A test name is a sentence that says what happens, not the name of a function:

```ts
describe('downloadFileWithProgress', () => {
  test('a redirect loop stops at the limit and leaves no partial file', async () => {
```

`describe` names the unit under test. The backend uses `test` from `node:test`. The frontend uses `it` from Vitest.
