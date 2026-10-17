# Contributing to kinetube

Thanks for helping. This page covers how to run kinetube from source, check a change and get it merged. The project rules and the full map of the docs are in [`CLAUDE.md`](CLAUDE.md).

## Before you start

Every change starts with a [GitHub issue](https://github.com/spacesdrive/kinetube/issues), labelled `bug`, `enhancement` or `documentation`. Search first, then open one that says what is wrong or wanted and what "done" looks like. Agreeing on the approach there saves a rewrite later.

If your change touches yt-dlp, FFmpeg, whisper.cpp or instaloader, read [`docs/philosophy/CROSS_PLATFORM.md`](docs/philosophy/CROSS_PLATFORM.md) first. For anything you can see in the app, read [`docs/design-reference.md`](docs/design-reference.md).

## Requirements

- [Node.js](https://nodejs.org) 22.18 or newer. In development, Node runs the backend and the scripts as TypeScript directly, without a build step.
- On Windows, the .NET Framework 4. The root `npm install` uses its `csc.exe` to patch electron-builder's 7-Zip (see [`docs/workflows/RELEASE.md`](docs/workflows/RELEASE.md)).

## Run in development

```bash
git clone https://github.com/spacesdrive/kinetube.git
cd kinetube
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
npm run dev
```

`npm run dev` does four things:

1. Compiles the Electron code into `electron/dist/`.
2. Starts the backend with `node --watch src/server.ts` on `127.0.0.1:3001`.
3. Starts Vite on port 5173. Vite forwards `/api` to the backend.
4. Waits until `/health` and Vite answer, then opens the Electron window.

In development, tools, models, sessions and downloads are kept in `backend/`.

## Check your change

```bash
npm run typecheck   # shared types, Electron, backend and frontend
npm test            # backend (node:test), then frontend (Vitest)
cd frontend && npm run lint
```

[`docs/workflows/TESTING.md`](docs/workflows/TESTING.md) lists what the tests cover and the manual checklist for a real download, install and transcription.

## Build installers

```bash
npm run dist:win    # Windows NSIS installer
npm run dist:mac    # macOS DMG (x64 and arm64), run on macOS
npm run dist:linux  # Linux AppImage
```

Installers land in `dist/`. The backend build removes the backend's dev dependencies, so run `cd backend && npm install` before you test or develop again. Releases are built by GitHub Actions when a `v*` tag is pushed; see [`docs/workflows/RELEASE.md`](docs/workflows/RELEASE.md).

## Project layout

```
kinetube/
  shared/types/      API request, response and stream-event types, shared by every part
  backend/src/       Express 5 API: routes, validators, controllers, services, stores, managers
  frontend/src/      React 19 interface: features, shell, patterns, shadcn ui, design tokens
  electron/src/      main process, backend process, updater, IPC, preload
  scripts/           build and demo helpers
  docs/              architecture, guidelines, workflows, design reference, media
```

The backend is layered: routes, then validators, controllers and services, then stores and managers. Only a manager starts a tool. [`docs/architecture/OVERVIEW.md`](docs/architecture/OVERVIEW.md) walks through a request from the window to the tool and back.

## Make the change

1. Fork the repository and create a branch from `main`, named `type/short-topic` (for example `fix/playlist-count`).
2. Follow [`docs/workflows/FEATURE_DEVELOPMENT.md`](docs/workflows/FEATURE_DEVELOPMENT.md). A changed endpoint starts in `shared/types/` and `docs/api/openapi.yaml`.
3. Write commits in the Conventional Commits format and name the issue in the body: `Refs #12` while you work, `Closes #12` in the last commit. [`docs/workflows/GIT.md`](docs/workflows/GIT.md) has the details.
4. Update the docs your change affects, and add a line to the `[Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md).
5. Run the checks above, then open a pull request that says what changed, why, and how you tested it.

Code style is set out in [`docs/guidelines/TYPESCRIPT.md`](docs/guidelines/TYPESCRIPT.md) and [`docs/guidelines/REACT.md`](docs/guidelines/REACT.md). Writing rules for code comments, docs and interface text are in [`docs/WRITING_STANDARDS.md`](docs/WRITING_STANDARDS.md): no emoji, and no dashes used as punctuation.

## The README animations

The animations in the README show the real interface, filmed with [Flute](https://github.com/webprodigies-org/flute). If your change alters a page they show, run `npm run demos` with `npm run dev` running to make them again. [`docs/workflows/DEMOS.md`](docs/workflows/DEMOS.md) explains the scenes and the settings.
