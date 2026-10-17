# Release workflow

## Overview

Pushing a tag that starts with `v` runs `.github/workflows/release.yml`. It builds on three runners in parallel (`windows-latest`, `macos-latest`, `ubuntu-latest`) and uploads every installer to the same GitHub Release with `softprops/action-gh-release`.

**Read `docs/philosophy/CROSS_PLATFORM.md` before you announce macOS or Linux support.** The tool managers resolve the right yt-dlp, FFmpeg and whisper.cpp build for each platform, but the macOS and Linux paths have not been verified on real hardware. The workflow builds a `.dmg` and an `.AppImage`; treat them as untested until someone runs the setup flow and a download on a real Mac and Linux machine.

## Targets

electron-builder reads the `build` section of the root `package.json`.

| Platform | Target | Arch | Output |
|---|---|---|---|
| Windows | `nsis` | x64 | `dist/KineTube-Setup-<version>.exe` |
| macOS | `dmg` | x64, arm64 | `dist/*.dmg` |
| Linux | `AppImage` | x64 | `dist/*.AppImage` |

All three use `build/icon.png`. `asar` is `false`, so the app files are shipped as plain files.

The installer name comes from the root `package.json`: `productName` (`KineTube`) and `version`. For version 2.0.0 the Windows build writes `dist/KineTube-Setup-2.0.0.exe`, and `latest.yml` names the same file.

## What goes into the package

`files` holds the Electron part of the app:

- `electron/dist/**/*`: the compiled main process and preload script
- `electron/loading.html`: the page shown until the backend answers `/health`. It shows the brand mark and the `kinetube` wordmark on the dark ground, with the mark embedded as a data URI because nothing else is served yet.

`extraResources` copies two folders next to the app, into `resources/`:

| From | To | Notes |
|---|---|---|
| `backend` | `resources/backend` | The compiled backend in `dist/`, `package.json`, the production `node_modules`, and the Python helpers in `python/` |
| `frontend/dist` | `resources/frontend/dist` | The built React app, served by the backend |

The `backend` copy leaves out:

| Pattern | Why |
|---|---|
| `.env` | Local secrets, if one ever exists |
| `src/**`, `tests/**`, `tsconfig*.json`, `*.tsbuildinfo` | TypeScript sources and build files; the package runs `dist/` |
| `python/__pycache__/**` | Python byte-code caches |
| `pending-downloads.json` | The developer's own download records |
| `sessions/**` | Instagram session files and `accounts.json` |
| `downloads/*.exe`, `*.dll`, `*.zip`, `*.bin` | Windows tool binaries and archives |
| `downloads/yt-dlp`, `ffmpeg`, `whisper-cli`, `main`, `*.so`, `*.so.*`, `*.dylib`, `*.tar.xz`, `*.download` | macOS and Linux tool binaries, their libraries and archives, and an unfinished yt-dlp update |
| `downloads/*.mp4`, `*.webm`, `*.mkv`, `*.mp3`, `*.m4a` | Downloaded media |
| `models/**` | Whisper models |

Tools, models and sessions are fetched or created on first run under Electron's `userData` folder instead. This keeps the installer small and lets tool versions change without an app release. It also means **the first start on every platform needs an internet connection**.

When a manager starts writing a new file name into `backend/downloads/`, add it to this filter and to `.gitignore` in the same commit.

## Build steps

All scripts are in the root `package.json`.

| Script | What it does |
|---|---|
| `npm run build:electron` | `tsc -b electron`: compiles `electron/src/*.ts` to CommonJS in `electron/dist/`. Electron 33 runs Node 20, which cannot run `.ts` files. |
| `npm run build:frontend` | `cd frontend && npm run build`: `tsc -b`, then `vite build` into `frontend/dist/` |
| `npm run build:backend` | `cd backend && npm run build && npm prune --omit=dev`: `tsc -b tsconfig.build.json` into `backend/dist/`, then removes the backend's dev dependencies |
| `npm run build` | All three, in that order |
| `npm run dist` | `build`, then `electron-builder --publish never` for the current platform's targets |
| `npm run dist:win` | `build`, then `electron-builder --win --publish never` |
| `npm run dist:mac` | `build`, then `electron-builder --mac --publish never` |
| `npm run dist:linux` | `build`, then `electron-builder --linux --publish never` |

**`build:backend` prunes the backend's dev dependencies** (TypeScript, `supertest`, the `@types` packages). After any `build` or `dist` script, run `cd backend && npm install` before you type check, test or run `npm run dev` again.

Run each `dist:*` script on its own platform. `dist:mac` needs macOS. The project builds each platform on its own CI runner and does not try cross-building.

## Environment variables Electron passes to the backend

In a packaged build, `electron/src/backendProcess.ts` starts `resources/backend/dist/server.js` with `utilityProcess.fork`. The child gets Electron's own environment plus:

| Variable | Value | Read by |
|---|---|---|
| `PORT` | `3001` | `readConfig` in `backend/src/config.ts`; the default is also 3001 |
| `ELECTRON_APP` | `1` | `readConfig`: turns on serving the built frontend |
| `ELECTRON_USER_DATA` | `app.getPath('userData')` | `readConfig`: the data folder for tools, models, sessions and `pending-downloads.json` |
| `ELECTRON_FRONTEND_DIST` | `resources/frontend/dist` | `readConfig`: the folder the backend serves the page from |

Without `ELECTRON_USER_DATA` (in development) the data folder is `backend/` itself. The backend listens on `127.0.0.1` only. Electron waits for `/health` (40 tries, half a second apart), then loads `http://localhost:3001`. The backend's output goes to `backend.log` in the `userData` folder.

## The 7-Zip patch (`scripts/patch-7zip.mts`)

electron-builder unpacks its `winCodeSign` tools with the bundled `7za.exe` from `7zip-bin`. That archive holds a `darwin/` folder with symbolic links. On Windows, creating symbolic links needs administrator rights or Developer Mode, so the unpack fails on a normal account and the Windows build stops.

The root `postinstall` script runs `node scripts/patch-7zip.mts` after every `npm install` in the root:

1. On macOS and Linux it does nothing.
2. On Windows it compiles a small C# wrapper with `csc.exe` from the .NET Framework 4.
3. It renames `node_modules/7zip-bin/win/x64/7za.exe` to `7za-real.exe` and puts the wrapper in its place.
4. The wrapper passes every argument through unchanged and adds `-xr!darwin` to extract and list commands, so the `darwin/` folder is skipped.

The script stops early if `7za-real.exe` already exists, so running it twice is safe. If `csc.exe` cannot be found, it exits with an error and the root `npm install` fails. Install the .NET Framework 4 in that case. The Windows runner in CI runs the same patch.

## GitHub Actions release flow (`.github/workflows/release.yml`)

Trigger: a pushed tag matching `v*`. The workflow has `contents: write` permission so it can create the release.

| Matrix entry | Runner | Script | Uploaded files |
|---|---|---|---|
| Windows | `windows-latest` | `dist:win` | `dist/*.exe`, `dist/latest*.yml` |
| macOS | `macos-latest` | `dist:mac` | `dist/*.dmg`, `dist/latest*.yml` |
| Linux | `ubuntu-latest` | `dist:linux` | `dist/*.AppImage`, `dist/latest*.yml` |

Each job runs these steps:

1. Check out the repository.
2. Set up Node 22 with the npm cache. Node 22 runs the `.mts` scripts directly.
3. `npm install` in the root. This also runs the 7-Zip patch.
4. `npm install` in `frontend/`.
5. `npm install` in `backend/`, with dev dependencies, because the build compiles the backend before it prunes them.
6. `npm run typecheck && npm test`. A type error or a failing test stops the job before anything is packaged.
7. `npm run <platform script>` with `GH_TOKEN` set.
8. Upload the installer and `dist/latest*.yml` to the GitHub Release, with generated release notes.

`fail-fast` is `false`, so a failure on one platform does not cancel the other two builds.

## The website workflow (`.github/workflows/deploy-site.yml`)

A second workflow builds and deploys the website in `site/`. It runs only when `site/` or the workflow changes, checks every pull request, and deploys `main` to the Cloudflare Pages project `kinetube-site` at https://kinetube.ujjwal.fyi with the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. It is separate from the release flow and never touches installers. See `docs/workflows/SITE.md`.

## Auto-update

`electron-updater` reads `latest.yml`, `latest-mac.yml` and `latest-linux.yml` from the GitHub Release to find out whether a newer version exists. The `publish` block in `package.json` (`provider: github`, `owner: spacesdrive`, `repo: kinetube`) tells it where to look. No other server is needed. See `docs/architecture/electron/MAIN_PROCESS.md` for the in-app flow: the app checks five seconds after start, and the person chooses when to download and install.

**The NSIS file name must never contain a space.** The workflow builds with `--publish never` and uploads `dist/*.exe` itself. The file name written into `latest.yml` and the name of the uploaded asset must match exactly, or the updater gets a 404 when it downloads the update (ADR-014). By default, electron-builder puts spaces in the NSIS file name, and GitHub replaces spaces with dots on upload, so the two names never matched. To fix this, `build.nsis.artifactName` is set to `${productName}-Setup-${version}.${ext}`, so the built file, the GitHub asset and `latest.yml` all use the same name.

## Versioning and tagging

The version in the root `package.json` is the app version and the tag name. The current version is 2.0.0, tagged `v2.0.0` on 2026-10-17. Its release notes label the macOS and Linux installers untested, as every release should until `docs/philosophy/CROSS_PLATFORM.md` records them as verified.

The root version reaches the person in three places:

- the installer name and `latest.yml`, through electron-builder
- `app.getVersion()` in Electron, which the About section in Settings shows
- `__APP_VERSION__`, which `frontend/vite.config.ts` reads from the root `package.json` at build time. About shows it when the frontend runs without Electron.

`backend/package.json` and `frontend/package.json` carry the same version, so every package matches the release. Change all three together.

Follow semantic versioning:

| Change | Bump | Example |
|---|---|---|
| Bug fixes only | Patch | v1.6.0 to v1.6.1 |
| New features | Minor | v1.6.1 to v1.7.0 |
| Breaking changes | Major | v1.7.0 to v2.0.0 |

## Cutting a release

1. Check that the `[Unreleased]` section of `CHANGELOG.md` lists everything since the last tag.
2. Bump `version` in the root `package.json`, `backend/package.json` and `frontend/package.json`, then run `npm install` in each folder so the three lock files match.
3. In `CHANGELOG.md`, move `[Unreleased]` under a new version heading with today's date.
4. Commit, then tag and push:

   ```bash
   git commit -m "release: vX.Y.Z - short description"
   git tag -a vX.Y.Z -m "vX.Y.Z - Short description"
   git push origin main --tags
   ```

5. Watch the workflow for all three platforms at https://github.com/spacesdrive/kinetube/actions.
6. Check that the GitHub Release has all three installers and the `latest*.yml` files.
7. Check that the `url` and `path` in each `latest*.yml` match the uploaded file names exactly. Compare `gh release view vX.Y.Z --json assets` with `gh release download vX.Y.Z --pattern "latest*.yml" --output -`. A mismatch means the in-app updater will fail even though the release page looks fine.

## Verifying a release

- Windows: install the `.exe`, let the setup screen install yt-dlp and FFmpeg, and download a YouTube video.
- macOS and Linux: install the artifact and check that the app starts and reaches the setup screen. Record what works and what fails in `docs/philosophy/CROSS_PLATFORM.md`.
- Updater: from an older installed version, check that the update dialog finds the new release. If needed, build a test version with a lower version number to see the prompt.
