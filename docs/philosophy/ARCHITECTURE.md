# Architectural principles

## Core principles

### 1. Everything stays on the person's computer

There are no accounts, no analytics and no server that KineTube depends on. The app only talks to the services it fetches from: YouTube, Instagram, GitHub releases, Hugging Face, the FFmpeg build hosts and PyPI. Downloaded media, transcripts and Instagram sessions never leave the machine.

**Why:** this is what the product offers (see `README.md`). Crash reporting, usage analytics or cloud sync would send data off the device. Any of them is a change of scope that needs the owner's explicit approval first.

### 2. The backend listens on loopback and answers only KineTube

The backend listens on `127.0.0.1` only. `backend/src/middleware/originGuard.ts` answers 403 unless the Host is `localhost:<port>` or `127.0.0.1:<port>`. When an Origin header is present, it must be the app itself or the Vite dev server. No CORS headers are sent (ADR-026).

**Why:** 1.x listened on every network interface and allowed every origin in the installed app, so any web page could start downloads. The Host check also stops DNS rebinding, where a web page points its own domain at 127.0.0.1.

### 3. The backend does the work, the renderer does none of it

Every file write, process start and outside network call happens in the backend. The renderer calls the backend's API and, for the few operating system features it needs (folder dialog, updater, app version), the bridge in `electron/src/preload.ts`.

**Why:** `contextIsolation: true` and `nodeIntegration: false` mean the page has no Node access at all. With all file and process work in one place, only one process has to know about development and packaged paths.

### 4. The backend is layered

A request goes down one way: route, controller, validator, service, then store or manager. A layer never calls the one above it.

| Layer | Job |
|---|---|
| Routes | Map a method and path to a controller method. |
| Controllers | Validate the input, call one service method, send JSON or a stream. |
| Validators | Turn untrusted input into typed values, or throw `ValidationError` / `NotFoundError`. |
| Services | Hold the rules: what can run at once, what is saved, which events are sent. |
| Stores and managers | Read and write files on disk, and run the tools. |

`backend/src/container.ts` builds every manager and service once at startup. Services hold running downloads, logins and installs for the life of the process. Factories take their dependencies as arguments, so tests pass in fake managers (`backend/tests/fixtures/fakeManagers.ts`).

**Why:** in 1.x one route file built yt-dlp arguments straight from query strings. With validation in one layer, every value that reaches a service already has a type and a checked range.

### 5. Managers own the external tools

yt-dlp, FFmpeg, whisper.cpp and instaloader are not in the installer. They are downloaded or installed on first use into the writable data folder. Each tool has a folder in `backend/src/managers/` that downloads it, installs it, finds it and starts it. **Only managers start tool binaries.**

**Why:** these tools change often (yt-dlp most of all, to keep up with YouTube) and some are large. Managing them at runtime keeps the installer small and lets the app update yt-dlp without an app release. The cost is that a fresh install needs internet access and a successful download before it is useful.

### 6. One writable data folder, chosen once

`backend/src/config.ts` picks the data folder: `ELECTRON_USER_DATA` when it is set, the `backend/` folder otherwise. `backend/src/lib/paths.ts` builds every writable path from it: tools, models, sessions, the pending download list and the account list.

**Why:** a packaged Windows app cannot write into its own install folder under Program Files. With one place that decides, no other file needs to know whether it runs packaged or in development (ADR-004).

### 7. Long work streams events and ends with `done`

Downloads, batches, tool installs, model downloads, transcriptions and Instagram profile lookups stream server-sent events (ADR-005). The frontend reads them with `fetch`, so actions can be POST requests with JSON bodies (ADR-025). Every stream ends with one `done` event, except a paused download, which ends with `paused`. `done` carries the result, or the same `code` and `message` a JSON error would. Closing the stream aborts the work where that makes sense.

**Why:** one contract means one reader on the frontend (`services/eventStream.ts`) and one way to show success or failure. Errors found before the stream opens are plain JSON errors, so the page can show the backend's message.

### 8. One API client

Every request from the frontend goes through `frontend/src/services/api.ts`. Components never call `fetch` (ADR-027). Stream events become state through pure reducers in `*State.ts` files.

**Why:** with one client there is one place that knows the base path, the error shape and how streams are read. The reducers can be tested without rendering anything.

### 9. The contract is shared types

`shared/types/` holds the request, response and stream-event types, and the Electron bridge type (ADR-028). The backend, frontend and Electron import them with `import type`, so nothing from that folder exists at runtime. Controllers check responses against them with `satisfies`.

**Why:** in 1.x the frontend and backend agreed on response shapes only by convention. Now a change to a route's shape fails to compile in every place that has to follow it.

### 10. Strict TypeScript, compiled only where the runtime needs it

All code is strict TypeScript with `erasableSyntaxOnly` (ADR-023). In development, Node 22.18 runs the backend's `.ts` files directly. Electron 33 runs on Node 20, which cannot, so the packaged backend and the Electron main process are compiled (ADR-029). See `docs/guidelines/TYPESCRIPT.md`.

**Why:** typed and validated values close the class of bugs behind several 1.x security fixes. Keeping to erasable syntax means development needs no build step for the backend.

### 11. Docs change with the code

Routes, IPC channels, environment variables, packaging settings, manager contracts and component conventions are documented in `docs/`. A change to any of them updates the matching doc in the same change, following the table in `CLAUDE.md`. Decisions go in `DECISIONS.md`, which is only ever appended to.

**Why:** the next person to change the code reads the docs first. A doc that describes old code sends them the wrong way.

## What this architecture is not

**Not a client-server product.** There is no multi-user concept, no remote database and no service the developer runs. "Backend" means the Express process this desktop app starts on the same computer, not a hosted API.

**Not verified on every platform it builds for.** The release workflow builds Windows, macOS and Linux installers. The managers choose a binary or build per platform, but only the Windows paths have been run on real hardware. `docs/philosophy/CROSS_PLATFORM.md` tracks what is verified.

**Not usable offline on first run.** Every tool, model and piece of media comes from the internet. "Privacy-first" here means that no data leaves the machine, not that the app works without a network.

## When to break these rules

Breaking any of these principles needs an entry in `DECISIONS.md` first:

- Shipping a tool binary inside the installer instead of downloading it: record the size and update trade-off.
- Adding any telemetry: record exactly what is collected, and get the owner's explicit approval first.
- Listening on anything other than `127.0.0.1`, or loosening the origin guard: record the need and how the API stays closed to web pages.
- Weakening `contextIsolation` or `nodeIntegration`: record the feature that needs it and how the risk is limited.
- Starting a tool binary outside a manager, or calling `fetch` outside `api.ts`: record why the existing layer cannot do it.
