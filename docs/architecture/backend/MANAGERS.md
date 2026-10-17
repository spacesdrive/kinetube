# Tool managers

KineTube depends on four external tools: yt-dlp, FFmpeg, whisper.cpp and instaloader. They are downloaded or installed on demand, never shipped in the installer (ADR-003). All code that downloads, installs, locates or starts one of them lives in `backend/src/managers/`, one folder per tool. **Only managers spawn tool binaries.** Services call manager methods; routes and controllers never touch a manager.

This document covers each manager's contract, how installs and updates work, and two stores that sit beside them: pending downloads and Instagram accounts.

## Shared contract

Every manager is created by a factory function in `src/container.ts` and receives the paths it needs as arguments. It never computes a writable path from its own location. The common pieces:

| Piece | Where | What it does |
|---|---|---|
| `isInstalled()` | each manager | A cheap check that the binary exists on disk. instaloader has `checkSetup()` instead. |
| `install(send)` | each manager | Installs the tool if it is missing. If it is already there, it sends one `phase` event with `phase: 'done'` and `isSkipped: true`, then returns. |
| `ToolEventSink` | `src/managers/toolEvents.ts` | The `send` function managers receive: `EventSink<Omit<ToolInstallEvents, 'done'>>`. Managers send `phase`, `progress` and `log` events. They never send `done`. |
| `downloadFileWithProgress(url, destination, onProgress)` | `src/lib/httpDownload.ts` | HTTP or HTTPS GET that follows up to 12 redirects and reports `TransferProgress`. A failed download deletes the partial file. |
| `markExecutable(path, platform)` | `src/lib/executable.ts` | `chmod 755` on macOS and Linux; does nothing on Windows. |
| `runProcess(command, args, options)` | `src/lib/runProcess.ts` | Runs a command to completion with an optional timeout and abort signal. Rejects only when the command cannot start. |
| `canRun(command)` | `src/lib/runProcess.ts` | True when `command --version` exits 0 within 8 seconds. Used for `git`, `cmake` and Python. |
| `killProcessTree(child)` | `src/lib/processTree.ts` | Stops a process and its children (see "Stopping a process"). |

`toolService` (`src/services/toolService.ts`) owns the install stream. It takes a per-tool lock before the stream opens, so a second install of the same tool gets 409. It calls `install(send)`, reads the tool's status with `readToolStatus()` (`src/services/tools/toolStatus.ts`), and sends the `done` event. If `install()` throws, the service sends a `phase` event with `phase: 'error'` and a failed `done` with code `UPSTREAM_FAILED`. Closing the stream does not stop an install.

Tool binaries are written to `downloadsDir` (`downloads/` in the data folder). Whisper models go to `modelsDir` (`models/`).

## YtdlpManager (`src/managers/ytdlp/`)

| File | Contents |
|---|---|
| `ytdlpManager.ts` | `createYtdlpManager(downloadsDir, platform)` and the `YtdlpManager` interface |
| `ytdlpBinary.ts` | `YTDLP_VERSION` (`2026.03.17`), the per-platform asset and binary names, release URLs |
| `ytdlpRelease.ts` | `fetchLatestYtdlpTag()`: GitHub's `releases/latest` API, 8 second timeout, `null` on any failure |
| `ytdlpArgs.ts` | `buildDownloadArgs()` and `buildMetadataArgs()`; both end with `--` and the link. Neither passes `--no-check-certificates`, so yt-dlp always checks TLS certificates. `buildMetadataArgs()` with `isPlaylist` lists a channel tab or a playlist with `--flat-playlist --dump-single-json`; a video uses `-J`. |
| `ytdlpFormats.ts` | `VIDEO_QUALITIES`, the format selectors, `qualityNeedsMerge()` |
| `ytdlpFileNames.ts` | the output file name template, title and final path helpers |
| `ytdlpOutput.ts` | `parseYtdlpLine()` turns a stdout line into progress, destination, post-processing or info; `summarizeErrorOutput()` |
| `ytdlpProcess.ts` | `startYtdlp()`: spawns yt-dlp for a download and returns `{ stop(), finished }` |

The `YtdlpManager` interface:

| Member | Behavior |
|---|---|
| `binaryPath` | `downloads/yt-dlp.exe` on Windows, `downloads/yt-dlp` elsewhere |
| `isInstalled()` | the binary exists |
| `readVersion()` | runs `--version` with a 15 second timeout; `null` if not installed or it fails |
| `install(send)` | downloads the pinned `YTDLP_VERSION` release asset for the platform |
| `update(send)` | finds the latest tag on GitHub, downloads it over the installed binary, returns the new version |
| `fetchLatestVersion()` | the latest GitHub tag, or `null` |
| `runMetadata(args, timeoutMs)` | runs yt-dlp to completion and returns stdout, stderr, exit code and `isTimedOut` |
| `startDownload(args, handlers)` | starts a download; `handlers.onLine` gets parsed stdout lines, `handlers.onErrorOutput` gets stderr text |

Release assets per platform (`ytdlpAssetName()`): `yt-dlp.exe` on Windows, `yt-dlp_macos` on macOS, `yt-dlp_linux` on Linux. Each is one standalone file, so nothing is extracted. Any other platform throws `NotSupportedError`.

`requiredVersion` in the `Tool` status is `YTDLP_VERSION`. `needsUpdate` is true only when the installed version is older than it, compared part by part by `isNewerVersion()` (`src/lib/versions.ts`). A binary updated past the pinned version is not flagged (ADR-022).

## FfmpegManager (`src/managers/ffmpeg/`)

| Member | Behavior |
|---|---|
| `binaryPath` | `downloads/ffmpeg.exe` on Windows, `downloads/ffmpeg` elsewhere |
| `binaryDir` | `downloadsDir`; yt-dlp's `--ffmpeg-location` takes the folder, not the file |
| `isInstalled()` | the binary exists |
| `install(send)` | downloads the static build for the platform, extracts `ffmpeg`, marks it executable |
| `extractAudio(input, output, signal)` | converts any input to 16 kHz mono 16-bit PCM WAV, the only format whisper.cpp reads |

Static builds per platform (`ffmpegDownloadInfo()` in `ffmpegBinary.ts`, ADR-011):

| Platform | Source | Archive | How the binary is found |
|---|---|---|---|
| Windows | `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip` | zip | the `ffmpeg.exe` entry inside a `bin/` folder |
| macOS | `https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip` | zip | the entry named `ffmpeg`; an x64 build that runs under Rosetta 2 on Apple Silicon |
| Linux | `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz` | tar.xz | unpacked with the system `tar -xJf` into a temp folder, then searched for `ffmpeg` |

Any other platform throws `NotSupportedError`. The archive is saved as `downloads/ffmpeg-setup.zip` or `.tar.xz` and always deleted afterwards, whether the install worked or not.

## WhisperManager (`src/managers/whisper/`)

| File | Contents |
|---|---|
| `whisperManager.ts` | `createWhisperManager({ downloadsDir, modelsDir, ffmpeg, platform })` |
| `whisperBinary.ts` | `WHISPER_VERSION` (`1.8.4`), the Windows zip URL, `findWhisperBinary()` |
| `whisperInstall.ts` | `installWhisperFromZip()` for Windows |
| `whisperBuild.ts` | `buildWhisperFromSource()` for macOS and Linux |
| `whisperModels.ts` | the five models, their file names and the Hugging Face URL |
| `whisperModelDownload.ts` | `downloadWhisperModel()` |
| `whisperTranscribe.ts` | `transcribeFile()`: WAV conversion, the run, the files written beside the input |
| `whisperRunner.ts` | `runWhisper()`: arguments, progress parsing, the 30 minute timeout |
| `whisperTranscript.ts` | `parseSegments()`: whisper's timestamped lines as segments in milliseconds. `cleanTranscription()`: strips timestamps and joins lines into one text |
| `whisperFormats.ts` | `TRANSCRIPT_FORMATS` and `renderTranscripts()`: the segments as TXT, SRT, VTT, LRC, CSV, TSV and JSON |

The `WhisperManager` interface:

| Member | Behavior |
|---|---|
| `isInstalled()` | `findWhisperBinary()` finds `whisper-cli` or the older `main` (with `.exe` on Windows); whisper.cpp renamed `main` to `whisper-cli` in 1.7 |
| `install(send)` | Windows: zip. macOS and Linux: source build. Throws if no binary is found afterwards. |
| `listModels()` | the five `WhisperModel` entries with `isDownloaded` |
| `isModelDownloaded(modelId)` | the model file exists in `modelsDir` |
| `downloadModel(modelId, send)` | downloads one model (see below) |
| `transcribe({ inputPath, modelId, language, formats, send, signal })` | converts to WAV if needed, runs whisper.cpp, renders every format, writes `<input name>.<format>` beside the input for each of `formats`, returns `{ text, transcripts, outputPaths }` |

Install on Windows: downloads `whisper-blas-bin-x64.zip` from the `v1.8.4` release to `downloads/whisper-setup.zip`, extracts every `.exe` and `.dll` into `downloadsDir` (the CLI needs the DLLs beside it), then deletes the zip.

Install on macOS and Linux (ADR-012). ggml-org publishes no prebuilt CLI for these platforms, so it is built from source:

1. `canRun('git')` and `canRun('cmake')`. If either is missing, the install fails with a message that names it and suggests `xcode-select --install` (macOS) or `sudo apt install git cmake build-essential` (Debian and Ubuntu).
2. `git clone --depth 1 --branch v1.8.4` into a new temp folder (phase `cloning`).
3. `cmake -B build -S .` (phase `configuring`).
4. `cmake --build build --config Release -j` (phase `building`). Build output is sent as `log` events.
5. Copies `whisper-cli` from `build/bin`, `build/bin/Release` or `build` into `downloadsDir`, marks it executable, and copies the `.so` and `.dylib` files beside it.
6. Deletes the temp folder.

The check does not look for a C or C++ compiler. A missing compiler shows up as a failed `cmake` step with the compiler's own error in the `log` events.

Models (`whisperModels.ts`): `tiny` (75 MB), `base` (142 MB), `small` (466 MB), `medium` (1.5 GB) and `large` (`ggml-large-v3.bin`, 2.9 GB), downloaded from `https://huggingface.co/ggerganov/whisper.cpp/resolve/main`. The same files work on every platform. `whisperModelService` locks each model while it downloads, so a second request gets 409, and closing the stream does not stop it.

Transcription: `runWhisper()` passes `-m`, `-f`, `-t` (half the CPU cores, at least 1) and `--print-progress`, plus `-l <language>` unless the language is `auto`. Progress comes from `progress = N%` on stderr. Each stdout line is a segment such as `[00:00:00.000 --> 00:00:02.500]  Hello there.`; its text arrives as a `chunk` event, and at the end the timestamps become the subtitle and data formats (ADR-041). SRT and VTT use `hh:mm:ss,mmm` and `hh:mm:ss.mmm`, LRC counts minutes past 59, CSV and TSV keep milliseconds as whisper.cpp's CSV and OpenAI Whisper's TSV do, and JSON uses seconds as OpenAI Whisper's JSON does. The run is stopped after 30 minutes, or when the abort signal fires. The temporary WAV file is deleted afterwards.

## InstaloaderManager and PythonDetector (`src/managers/instaloader/`)

instaloader is a Python package, not a binary. KineTube installs it with pip into whatever Python it finds, and talks to it through two helper scripts in `backend/python/`.

`PythonDetector` (`pythonDetector.ts`):

- `detect()` tries the Python commands in order with `canRun()`: `python` then `python3` on Windows, `python3` then `python` on macOS and Linux. For the first one that runs, it checks `import instaloader` with an 8 second timeout.
- It returns `{ pythonCommand, hasInstaloader }`. Only a complete setup (Python and instaloader both found) is cached, so installing either one is noticed on the next check.
- `forget()` drops the cache after pip installs instaloader.

`InstaloaderManager` (`instaloaderManager.ts`):

| Member | Behavior |
|---|---|
| `checkSetup()` | `detector.detect()`; `readToolStatus()` turns a missing Python into `missingRequirement: 'python'` |
| `install(send)` | Throws if Python is missing. Otherwise runs `<python> -m pip install instaloader` (phase `installing`), sends pip's output as `log` events, then calls `detector.forget()`. |
| `startHelper(script)` | Starts `instaloader_login.py` (`'login'`) or `instaloader_profile.py` (`'profile'`) and returns a `PythonHelper`. Throws `ToolNotInstalledError` (503) when Python or instaloader is missing. |

## PythonHelper and the JSON lines protocol (`pythonHelper.ts`)

`startPythonHelper(pythonCommand, scriptPath)` spawns the script with `PYTHONIOENCODING=utf-8` and `PYTHONUTF8=1`, because Windows defaults to cp1252 and would crash on non-Latin usernames and captions. The backend and the script exchange one JSON object per line over stdin and stdout. stderr is read and discarded.

| Member | Behavior |
|---|---|
| `write(message)` | writes one JSON line to the script's stdin |
| `nextMessage(timeoutMs, timeoutMessage)` | resolves with the next JSON line; on timeout it kills the script and rejects with `UpstreamTimeoutError` (504) |
| `kill()` | `killProcessTree()` on the script |

Lines that are not JSON objects are skipped. If Python cannot start, reads reject with `ToolNotInstalledError`. If the script exits, reads reject with `UpstreamError` ("The instaloader helper stopped without answering.").

Login (`instaloader_login.py`, used by `instagramAccountService`):

| Direction | Message |
|---|---|
| backend to script | `{"username": "...", "password": "...", "sessions_dir": "..."}` |
| script to backend | `{"status": "success"}`, `{"status": "twofa_required"}` or `{"status": "error", "message": "..."}` |
| backend to script, after `twofa_required` | `{"code": "123456"}` |
| script to backend | `{"status": "success"}` or `{"status": "error", "message": "..."}` |

Each reply must arrive within 45 seconds. On `twofa_required` the service keeps the running helper in `pendingLogins` (`src/services/instagram/pendingLogins.ts`) for up to 5 minutes, keyed by username, so `POST /instagram/accounts/:username/two-factor` can send the code to the same process. The script saves the session as `sessions/session-<username>`.

Profile (`instaloader_profile.py`, used by `scrapeProfile()` in `src/services/instagram/profileScraper.ts`):

| Direction | Message |
|---|---|
| backend to script | `{"username": "target", "session_username": "me", "sessions_dir": "...", "max_posts": 500}` |
| script to backend, first | `{"type": "profile", "channelName": "...", "username": "...", "mediacount": N, "avatar": "..."}` |
| script to backend, one per post | `{"type": "progress", "fetched": N, "mediacount": M}` |
| script to backend, last | `{"type": "done", "status": "success", "posts": [...], "truncated": true}` or `{"type": "done", "status": "error", "message": "..."}` |

The whole profile read has a 5 minute deadline. `session_username` is empty when no saved account has a session; the script then reads the profile logged out.

## Stopping a process

`killProcessTree(child)` in `src/lib/processTree.ts` is the only way to stop a tool process. yt-dlp's release binaries are PyInstaller "onefile" builds: the process Node starts is a launcher that runs the real worker as a child. A plain `child.kill()` ends only the launcher, and the download keeps running (ADR-021).

- Windows: `taskkill /pid <pid> /t /f`.
- macOS and Linux: `process.kill(-pid, 'SIGTERM')` on the process group. This needs the child to lead its own group, so every spawn uses `TREE_SPAWN_OPTIONS` (`detached: true` off Windows, `windowsHide: true` on Windows).

`runProcess()`, `startYtdlp()` and `startPythonHelper()` all use these options and this kill, for timeouts, abort signals, pause and cancel.

## Install and update behavior

| Tool | Download target | How the binary is put in place |
|---|---|---|
| yt-dlp install and update | `downloads/yt-dlp(.exe).download` | renamed over the binary only when the download is complete, then marked executable. A failed update leaves the working binary in place. |
| FFmpeg | `downloads/ffmpeg-setup.zip` or `.tar.xz` | the binary is extracted straight to its final path, then marked executable. The archive is always deleted. |
| whisper.cpp on Windows | `downloads/whisper-setup.zip` | the `.exe` and `.dll` files are extracted straight into `downloads/`. The zip is always deleted. |
| whisper.cpp on macOS and Linux | a temp source folder | `whisper-cli` and its shared libraries are copied into `downloads/`. The source folder is always deleted. |
| whisper models | `models/<file>.download` | renamed to the real name only when complete. A file under 1 MB is treated as an error page, deleted, and the download fails. |
| instaloader | pip | pip installs into the detected Python. |

The temp-then-rename pattern matters for yt-dlp and the models because `isInstalled()` and `isModelDownloaded()` only check that the file exists. A half-written file under the final name would count as installed.

Only yt-dlp can be updated in place (`POST /tools/ytdlp/update`). The other tools are installed once.

## Pending downloads (`src/stores/pendingDownloadStore.ts`)

`pending-downloads.json` at the data folder root holds every single download that has started and not finished (ADR-017). Batch items are not recorded. The download runner in `src/services/downloads/` keeps it current:

| Moment | What happens to the record |
|---|---|
| A download starts or resumes | saved with `pausedAt: null` |
| yt-dlp reports the file name | saved again with the title |
| The download finishes, fails or is cancelled | removed |
| The stream is closed by the client | treated as a cancel: removed |
| The download is paused | kept, with `pausedAt` set |
| The app closes while it runs | left as it is |

Each record is a `Download` without `status`: `id`, `platform`, `url`, `title`, `options`, `startedAt`, `pausedAt`. The status is worked out when it is read: `paused` if `pausedAt` is set, `active` if the runner is running it now, otherwise `interrupted`. An interrupted record is one the app was closed on.

`makeDownloadId()` (`src/services/downloads/downloadIds.ts`) hashes the clean URL and every option that shapes yt-dlp's output path (quality, audio only, output folder, file name options, account) into 16 hex characters. The same request always gets the same id, so starting it again reuses its record.

Resume replays the saved options exactly. yt-dlp continues the `.part` file on its own as long as the output path is the same, which is why the options are never rebuilt from the person's current settings.

Pause is the same process kill as cancel (ADR-020). There is no real suspend, because Windows has no equivalent of `SIGSTOP` without a native addon. The difference is only in the record: pause keeps it, cancel removes it. A pause ends the stream with a `paused` event instead of `done`.

Records written by 1.x stored their options as flat fields (`quality`, `audioOnly`, `outputDir`, `prefix`, `suffix`, `mainName`, `useNumbering`, `sequenceNum`). `readDownloadRecord()` (`src/stores/downloadRecord.ts`) detects a record without an `options` object and turns it into the new shape with `platform: 'youtube'` and `account: null`. The id is kept, so an interrupted 1.x download still appears and can be resumed or dismissed.

The file is written with `writeJsonAtomic()` (`src/stores/jsonFile.ts`): it writes `<file>.tmp` and renames it, so a crash mid-write never leaves half a file. A missing or corrupt file reads as empty.

## Instagram account store (`src/stores/instagramAccountStore.ts`)

`sessions/accounts.json` lists saved accounts as `{ username, addedAt }`. Session files sit beside it as `sessions/session-<username>`, the name the helper scripts use. Only this store and the helper scripts touch these files, and no route returns a session file.

| Member | Behavior |
|---|---|
| `list()` | every stored account with `hasSession` (the session file exists); entries with an invalid username are skipped |
| `find(username)` | one account, or `null` |
| `add(username)` | adds the account with the current time, or returns the existing one |
| `remove(username)` | deletes the session file and the entry; `false` if there was no entry |
| `sessionPath(username)` | the session file path |

Usernames are validated before they reach the store, and the store checks them again when it reads the file. `accounts.json` is written with `writeJsonAtomic()`.

## Adding or extending a manager

See `docs/features/NEW_TOOL_MANAGER.md`, and read `docs/philosophy/CROSS_PLATFORM.md` for the current state of each tool per platform.
