# Release Workflow

## Overview

Releases are built by `.github/workflows/release.yml` on every push of a `v*` tag, across three runners in parallel (`windows-latest`, `macos-latest`, `ubuntu-latest`), and published to the same GitHub Release via `softprops/action-gh-release`.

**Read `docs/philosophy/CROSS_PLATFORM.md` before promoting the macOS or Linux artifact as a real release.** The workflow successfully produces a `.dmg` and an `.AppImage`, but as of this writing the app's core features (download, transcription, Instagram scraping) do not work on those platforms because the tool managers only fetch Windows binaries. Do not announce macOS/Linux support as complete until that gap is closed.

## electron-builder Configuration (`package.json` -> `build`)

| Platform | Target | Arch |
|---|---|---|
| Windows | `nsis` | x64 |
| macOS | `dmg` | x64, arm64 |
| Linux | `AppImage` | x64 |

```json
"extraResources": [
    { "from": "backend", "to": "backend", "filter": ["**/*", "!.env", "!downloads/*.exe", "!downloads/*.dll", "!downloads/*.zip", "!downloads/*.bin", "!downloads/*.mp4", "!downloads/*.webm", "!downloads/*.mkv", "!downloads/*.mp3", "!downloads/*.m4a", "!models/**"] },
    { "from": "frontend/dist", "to": "frontend/dist" }
]
```

Managed binaries, downloaded media, and models are excluded from the packaged app on every platform - they are fetched on first run into `app.getPath('userData')` instead (see `backend/utils/paths.js`). This keeps the installer small and lets tool versions update independently of app releases, but it also means **every platform's first launch requires a working internet connection** to become useful.

`asar: false` - the app is shipped unpacked so the Express backend's `require()` graph resolves normally under `utilityProcess.fork` without asar-path translation concerns.

## Local Build Commands

```bash
npm run build:frontend    # vite build -> frontend/dist
npm run build:backend     # npm install --omit=dev inside backend/
npm run dist:win          # build:frontend + build:backend + electron-builder --win
npm run dist:mac          # ... --mac
npm run dist:linux        # ... --linux
npm run dist              # all configured targets for the current host platform
```

Cross-compiling is not attempted locally - `dist:mac` must run on macOS (or CI's `macos-latest` runner) to produce a signed-enough `.dmg`; `dist:win`/`dist:linux` have the same constraint per electron-builder's own platform requirements.

## GitHub Actions Release Flow (`.github/workflows/release.yml`)

Trigger: push of a tag matching `v*`.

| Matrix entry | Runner | Script | Published artifact |
|---|---|---|---|
| Windows | `windows-latest` | `dist:win` | `dist/*.exe` |
| macOS | `macos-latest` | `dist:mac` | `dist/*.dmg` |
| Linux | `ubuntu-latest` | `dist:linux` | `dist/*.AppImage` |

Each job: checkout, Node 20 setup, `npm install` at root, `npm install` in `frontend/`, `npm install --omit=dev` in `backend/`, run the platform's `dist:*` script, upload the artifact plus `dist/latest*.yml` (used by `electron-updater` for auto-update version checks) to the GitHub Release.

`fail-fast: false` is set deliberately - a build failure on one platform should not cancel the other two in-flight builds.

## Auto-Update

`electron-updater` reads `dist/latest*.yml` (per-platform: `latest.yml`, `latest-mac.yml`, `latest-linux.yml`) from the GitHub Release to determine whether an update is available. See `docs/architecture/electron/MAIN_PROCESS.md` - Auto-Updater for the in-app flow. No additional server or config is required beyond the GitHub Release itself; `electron-builder`'s `publish.provider: "github"` block in `package.json` wires this up.

## Cutting a Release

1. Ensure `CHANGELOG.md`'s `[Unreleased]` section reflects everything shipped since the last tag
2. Bump `version` in `package.json` (root) - this becomes the app version and the tag name
3. Move `[Unreleased]` to a new version heading with today's date in `CHANGELOG.md`
4. Commit: `release: vX.Y.Z - short description`
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z - short description"`
6. Push: `git push origin main --tags`
7. Watch `.github/workflows/release.yml` run for all three platforms at https://github.com/spacesdrive/kinetube/actions
8. Verify the GitHub Release has all three artifacts plus the `latest*.yml` files before announcing

## Verifying a Release

- **Windows:** download and run the `.exe`, confirm first-run tool setup completes and a YouTube download succeeds
- **macOS / Linux:** download and run the artifact, confirm the app launches and reaches the setup screen - do not yet expect downloads/transcription/Instagram to work; see `docs/philosophy/CROSS_PLATFORM.md`
- Confirm the in-app updater detects the new version from a previous install (bump a test build's version down temporarily if needed to verify the update prompt appears)
