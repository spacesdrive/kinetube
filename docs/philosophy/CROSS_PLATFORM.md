# Cross-platform support: current state and gaps

The release workflow (`.github/workflows/release.yml`) builds installers for three platforms:

| Platform | Target | Architectures |
|---|---|---|
| Windows | NSIS installer | x64 |
| macOS | dmg | x64 and arm64 |
| Linux | AppImage | x64 |

Every tool manager in `backend/src/managers/` picks its download per platform. None of them is Windows-only. An older note in `CLAUDE.md` ("Known issues") still says the managers download a Windows `.exe` unconditionally. That stopped being true on 2026-07-26, when the macOS and Linux paths were added (ADR-011, ADR-012), and the TypeScript rewrite kept them.

What is still open is mostly verification: the macOS and Linux paths have unit tests for their pure parts, but they have not been run end to end on real Mac or Linux hardware (see `ROADMAP.md`). The release workflow runs `npm run typecheck && npm test` on Windows, macOS and Ubuntu runners before it packages, so the unit tests run on all three. No test downloads or runs a real tool.

## Per-platform state of each tool

| Tool | Windows | macOS | Linux |
|---|---|---|---|
| yt-dlp | `yt-dlp.exe` release asset. Verified. | `yt-dlp_macos` asset. Not yet run on real hardware. | `yt-dlp_linux` asset (x86_64). Not yet run on real hardware. |
| FFmpeg | gyan.dev essentials zip. Verified. | evermeet.cx zip, x64 build under Rosetta 2 on Apple Silicon. Not yet run on real hardware. | johnvansickle.com amd64 static `tar.xz`, unpacked with the system `tar`. Not yet run on real hardware. |
| whisper.cpp | `whisper-blas-bin-x64.zip` from the v1.8.4 release. Verified. | built from source with `git` and `cmake`. Not yet run on real hardware. | built from source with `git` and `cmake`. Not yet run on real hardware. |
| instaloader | `pip install` into `python`, then `python3` | `pip install` into `python3`, then `python` | `pip install` into `python3`, then `python` |

### yt-dlp

`ytdlpAssetName(platform)` in `backend/src/managers/ytdlp/ytdlpBinary.ts` picks the asset from the pinned release (`YTDLP_VERSION`, `2026.03.17`), or from the latest release on update. Each asset is one standalone file, so nothing is extracted. The local name is `yt-dlp.exe` on Windows and `yt-dlp` elsewhere, and `markExecutable()` sets `chmod 755` off Windows. Any other platform throws `NotSupportedError`.

When yt-dlp's release list was last checked (2026-07-26), it described `yt-dlp_macos` as a universal build. It described `yt-dlp_linux` as an x86_64 glibc build. `yt-dlp_linux_aarch64` exists upstream but is not used; the Linux installer is x64 only, so this matches what ships.

All yt-dlp release binaries are PyInstaller "onefile" builds. Each one is a launcher that starts the real worker as a child process. `killProcessTree()` (`backend/src/lib/processTree.ts`) stops the whole tree: `taskkill /t /f` on Windows, a process group `SIGTERM` elsewhere, with every child spawned `detached: true` off Windows (ADR-021). The Windows path was confirmed by reproduction. The POSIX path follows the same reasoning and has not been confirmed on real hardware.

### FFmpeg

`ffmpegDownloadInfo(platform)` in `backend/src/managers/ffmpeg/ffmpegBinary.ts` picks the same static builds the `ffmpeg-static` npm package uses (ADR-011):

| Platform | URL | Extraction |
|---|---|---|
| Windows | `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip` | the `ffmpeg.exe` entry inside `bin/` |
| macOS | `https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip` | the entry named `ffmpeg` |
| Linux | `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz` | `tar -xJf` into a temp folder, then a search for `ffmpeg` |

The macOS URL always redirects to the current release. evermeet.cx does not build for Apple Silicon, so arm64 Macs run the x64 build through Rosetta 2. The Apple Silicon builds that exist elsewhere have no stable URL, so they were not used.

### whisper.cpp

ggml-org publishes a prebuilt CLI for Windows only (ADR-012).

- Windows: `installWhisperFromZip()` downloads `whisper-blas-bin-x64.zip` from the `v1.8.4` release and extracts every `.exe` and `.dll` into the downloads folder.
- macOS and Linux: `buildWhisperFromSource()` checks for `git` and `cmake`, clones tag `v1.8.4` into a temp folder, runs `cmake -B build -S .` and `cmake --build build --config Release -j`, then copies `whisper-cli` and the `.so` and `.dylib` files beside it into the downloads folder.

`findWhisperBinary()` looks for `whisper-cli` first and the older name `main` second, with `.exe` on Windows only. Models come from Hugging Face and are the same files on every platform.

### instaloader

instaloader is a pip package, so the code is the same on every platform. `createPythonDetector()` in `backend/src/managers/instaloader/pythonDetector.ts` tries the Python commands in this order:

- Windows: `python`, then `python3`.
- macOS and Linux: `python3`, then `python`.

The first command that answers `--version` is used for `python -m pip install instaloader` and for the helper scripts in `backend/python/`. Both helpers set UTF-8 output, because Windows defaults to cp1252. Python 3 must be installed on every platform; the setup status reports `missingRequirement: 'python'` when it is not.

## Remaining gaps

| Gap | Platforms | Effect | Status |
|---|---|---|---|
| No end-to-end run on real hardware | macOS, Linux | yt-dlp, FFmpeg, whisper.cpp installs and the POSIX process-tree kill are implemented from documentation and unit tested, but not run | open; tracked in `ROADMAP.md` |
| FFmpeg is an x64 build | macOS on Apple Silicon | needs Rosetta 2; the first run may prompt to install it | accepted (ADR-011) |
| No arm64 builds for yt-dlp and FFmpeg | Linux | an arm64 Linux machine gets x86_64 binaries that will not run | matches the x64-only AppImage target |
| whisper.cpp source build needs a C/C++ compiler | macOS, Linux | the preflight checks `git` and `cmake` only; a missing compiler shows up as a failed `cmake` step with the compiler's own error in the log | open; tracked in `ROADMAP.md` |
| FFmpeg extraction needs the system `tar` with xz support | Linux | if `tar` cannot run, the install fails with "Install tar and xz-utils, then try again." | accepted |
| pip install into the system Python | Linux, macOS | Some systems mark their Python as externally managed (PEP 668), for example recent Debian and Ubuntu releases and Homebrew Python. pip then refuses the install, and setup fails with "pip couldn't install instaloader". | not handled; not tested in KineTube |
| `POST /api/v1/folders/pick` used only PowerShell | macOS, Linux | Fixed: each platform has its own picker in `backend/src/services/folders/`. Windows uses PowerShell, macOS uses `osascript` (`choose folder`), Linux tries `zenity` and then `kdialog`. On Linux without either tool it answers 501 and says to install one or type the path. The desktop app still uses Electron's `dialog` (`frontend/src/lib/folderPicker.ts`); the route only serves the frontend in a plain browser. The macOS and Linux pickers are unit tested with a fake process runner and not yet run on real hardware. | fixed |
| Path examples in error messages | macOS, Linux | Fixed: `folderValidators.ts` and `transcriptionValidators.ts` take their example from `validators/pathExamples.ts`, which gives `C:\Users\you\Videos` on Windows, `/Users/you/Movies` on macOS and `/home/you/Videos` on Linux. | fixed |
| Packaging filter only knew Windows file names | macOS, Linux build machines | Fixed: the `extraResources` filter and `.gitignore` now also leave out the extensionless `yt-dlp`, `ffmpeg`, `whisper-cli` and `main`, the `.so` and `.dylib` libraries, the `.tar.xz` archive and an unfinished `.download` file. | fixed |
| Instagram downloads run logged out | all | yt-dlp cannot read instaloader's session file (a Python pickle). Post lookups and downloads never use the saved login, so private posts fail. Profile listings still use the session through instaloader. | open; a cookie export is on `ROADMAP.md` (ADR-030) |

## Review checklist for manager changes

Use this for any change in `backend/src/managers/`, `backend/src/lib/processTree.ts`, `backend/src/lib/runProcess.ts` or the packaging config.

- [ ] A new `.exe` suffix, Windows-only URL or `win32` branch has matching macOS and Linux branches, or the other platforms fail with a clear `NotSupportedError`.
- [ ] Every platform choice is made in a pure function that takes `platform` as an argument, with a unit test per platform.
- [ ] New binaries are passed to `markExecutable()`.
- [ ] Every new process is spawned with `TREE_SPAWN_OPTIONS` and stopped with `killProcessTree()`.
- [ ] Every writable path is under the data folder from `createAppPaths()` or the system temp folder, and is joined with `path.join()`.
- [ ] Every system command the change needs (`tar`, `git`, `cmake`, Python) is checked first, with an error that names it and says how to install it.
- [ ] The packaging filter still leaves out every downloaded binary and library on every platform.
- [ ] This document still says exactly what works where. Partial progress is recorded as partial, and "not yet run on real hardware" stays until someone has run it.

On a real Mac or Linux machine, run the setup screen, a YouTube download with merging, a pause and resume, a transcription and an Instagram login. Then update the per-platform table above. That is the most useful update this document can get.
