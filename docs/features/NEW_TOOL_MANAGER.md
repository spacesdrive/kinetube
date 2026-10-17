# Guide: adding or extending a managed tool

Use this guide to add a new external tool that KineTube downloads and runs, or to extend one of the four existing managers (yt-dlp, FFmpeg, whisper.cpp, instaloader), for example to support another platform. Read `docs/architecture/backend/MANAGERS.md` for the existing contracts and `docs/philosophy/CROSS_PLATFORM.md` for what each tool does on each platform today.

## Decide before you write code

Answer these first and record the answers in a new ADR in `DECISIONS.md`:

1. Does the tool publish ready-made binaries for Windows, macOS and Linux? If one platform has none, decide what happens there: a source build (as whisper.cpp does, ADR-012), a package manager (as instaloader does with pip), or a clear `NotSupportedError`. Never let it hang or fail with an unexplained error.
2. What is the asset name and archive type per platform and CPU architecture? yt-dlp publishes a separate standalone file per platform; FFmpeg comes as a zip on Windows and macOS and a `tar.xz` on Linux.
3. Can the source be trusted? Prefer the tool's own releases or a source the ADR can justify. ADR-012 explains why an unofficial prebuilt whisper.cpp binary was turned down.
4. Does the binary need other files beside it (DLLs, `.so` or `.dylib` files) or an execute bit? `markExecutable()` sets `chmod 755` off Windows.
5. Is the version pinned? yt-dlp pins `YTDLP_VERSION` and whisper.cpp pins `WHISPER_VERSION`; FFmpeg uses each source's current release.
6. Does it start child processes of its own? If so, it must be stopped with `killProcessTree()` (ADR-021).

## Folder layout

Each tool has its own folder in `backend/src/managers/`:

```
backend/src/managers/mytool/
  mytoolManager.ts   createMytoolManager(downloadsDir, platform) and the MytoolManager interface
  mytoolBinary.ts    pure: binary name, download URL and archive type per platform; no I/O
  mytoolArgs.ts      pure: builds the command-line arguments (when the tool takes many)
  mytoolOutput.ts    pure: parses the tool's output lines (when progress comes from stdout)
```

Use `ytdlp/` and `ffmpeg/` as the models. Split a file when it holds more than one job, as `whisper/` does with `whisperInstall.ts`, `whisperBuild.ts`, `whisperModelDownload.ts` and `whisperRunner.ts`.

Rules:

- The factory takes the paths it needs as arguments (`downloadsDir`, `modelsDir`) and a `platform: NodeJS.Platform = process.platform` parameter, so tests can pass any platform. Never build a writable path from the code's own location.
- Every function that depends on the platform takes `platform` as an argument and stays pure, like `ytdlpAssetName(platform)` and `ffmpegDownloadInfo(platform)`. A platform without support throws `NotSupportedError` with the platform's name.
- Only the manager spawns the tool. Use `runProcess()` for a command that runs to completion and `spawn(..., TREE_SPAWN_OPTIONS)` for a long-running one, and stop it with `killProcessTree()`.

## The manager interface

Every manager has at least:

```ts
export interface MytoolManager {
  binaryPath: string;
  isInstalled(): boolean;
  install(send: ToolEventSink): Promise<void>;
}
```

`install(send)` follows the shape of `createFfmpegManager().install`:

```ts
async install(send) {
  if (fs.existsSync(binaryPath)) {
    send('phase', { toolId: 'mytool', phase: 'done', message: `${binaryName} is already installed`, isSkipped: true });
    return;
  }
  await downloadAndExtract(send);
  send('phase', { toolId: 'mytool', phase: 'done', message: `${binaryName} installed`, isSkipped: false });
},
```

- `ToolEventSink` (`backend/src/managers/toolEvents.ts`) sends `phase`, `progress` and `log` events. The manager never sends `done`; `toolService` does that after it reads the new status.
- Phases come from `ToolPhase` in `shared/types/tools.ts`: `downloading`, `extracting`, `cloning`, `configuring`, `building`, `installing`, `done`, `error`. Add a value there only if none fits.
- Pass download progress through: `downloadFileWithProgress(url, path, (progress) => send('progress', { toolId: 'mytool', ...progress }))`.
- On failure, throw an `Error` whose message says what failed and what to do. `toolService` turns it into an `error` phase and a failed `done` with code `UPSTREAM_FAILED`.
- Delete every temporary file in a `finally` block, as FFmpeg does with its archive.
- If `isInstalled()` only checks that the file exists, download to a temporary name and rename it when complete, as `ytdlpManager.ts` does with `<binary>.download`. Otherwise a half-written file counts as installed.

## Register the tool

A new tool id touches these places. `POST /api/v1/tools/:toolId/install` then works with no route change.

| File | Change |
|---|---|
| `shared/types/tools.ts` | Add the id to `ToolId`. |
| `backend/src/services/tools/toolStatus.ts` | Add it to `TOOL_IDS` and `TOOL_NAMES`, add the manager to `ToolManagers`, and add a branch to `readToolStatus()`. |
| `backend/src/services/toolService.ts` | Add an entry to the `installers` map. |
| `backend/src/container.ts` | Create the manager in `createContainer()` and pass it to the services that need it. |
| `backend/tests/fixtures/fakeManagers.ts` | Add a fake manager and include it in `createFakeManagers()`. |
| `docs/api/openapi.yaml` | Add the id to the `ToolId` enum. |
| `frontend/src/features/setup/` | Only if the tool belongs on the first-run setup screen, which installs `ytdlp` and `ffmpeg` (`SETUP_ORDER` in `useToolSetup.ts`). |

The install route takes a lock per tool id before the stream opens, so a second install request gets 409. Closing the stream does not stop the install. Only yt-dlp has an update route; a new tool that needs one gets its own case in `toolService.update()`.

Extending an existing manager (for example adding Linux arm64 to FFmpeg) usually only touches its `<tool>Binary.ts` file and its tests.

## Cross-platform checklist

- [ ] Every platform the release workflow ships (Windows x64, macOS x64 and arm64, Linux x64) either works or fails with a clear message.
- [ ] No `.exe` suffix, Windows URL or `win32` branch is left without an equal branch for the other platforms.
- [ ] The binary name comes from a function of `platform`, never a constant with `.exe`.
- [ ] Downloaded binaries are passed to `markExecutable()`.
- [ ] Every spawn uses `TREE_SPAWN_OPTIONS` and every stop uses `killProcessTree()`.
- [ ] Paths are joined with `path.join()`, and files are written only under `downloadsDir` or `modelsDir`, or the system temp folder.
- [ ] Commands the tool needs from the system (`tar`, `git`, `cmake`, Python) are checked with `canRun()`, and the error names the missing command and how to install it.
- [ ] Extensionless binaries and shared libraries are kept out of the packaged app. The `extraResources` filter in the root `package.json` lists `.exe`, `.dll`, `.zip` and `.bin` files in `downloads/` today; add patterns for any new file.
- [ ] `docs/philosophy/CROSS_PLATFORM.md` says exactly which platforms are done, which are not, and which are not yet tested on real hardware.

## Tests

- Pure functions: test the per-platform results, including the `NotSupportedError` for an unknown platform. `backend/tests/managers/ytdlp/ytdlpBinary.test.ts` and `backend/tests/managers/ffmpeg/ffmpegBinary.test.ts` are the models.
- Output parsers: feed real output lines, as `backend/tests/managers/ytdlp/ytdlpOutput.test.ts` does.
- Install flow: `backend/tests/services/toolService.test.ts` covers the lock, the `done` event and the failure message with fake managers. Add a case if the new tool behaves differently.
- Routes: add the id to the tools tests in `backend/tests/routes/apiRoutes.test.ts`; the list test expects one entry per tool.

The real download, extract and run are not automated. Check them by hand on each platform you can reach, and add a row to the manual checklist in `docs/workflows/TESTING.md`.

## Docs to update

- `docs/architecture/backend/MANAGERS.md`: the new manager's interface, sources and install behavior.
- `docs/philosophy/CROSS_PLATFORM.md`: the per-platform state.
- `DECISIONS.md`: the ADR from the first section.
- `CHANGELOG.md`: a line under Unreleased.
