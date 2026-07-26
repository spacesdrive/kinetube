# Roadmap

Planned features, improvements, and known gaps. Items within each section are roughly prioritized - top items first.

Update this file whenever a feature ships (move to `CHANGELOG.md`) or when priorities change.

---

## In Progress

- None currently tracked.

---

## Next Up (High Priority)

### Verify cross-platform tool support on real macOS/Linux hardware

**Status as of 2026-07-26: implemented, not yet hardware-verified.** yt-dlp, ffmpeg, and whisper.cpp all now have platform-aware download/build logic (see `docs/philosophy/CROSS_PLATFORM.md` and `DECISIONS.md` ADR-011/ADR-012), and instaloader was confirmed already cross-platform via its existing pip/Python-module path (dead Windows-only exe code removed, see ADR-010). Everything was implemented from verified current documentation of each tool's real release assets and covered by unit tests for the pure platform-resolution logic - but this development environment is Windows-only, so none of the macOS/Linux code paths have actually been run end-to-end on real hardware yet.

**Remaining work:**
- Run the full setup flow on a real Mac (both Intel and Apple Silicon, to confirm the Rosetta 2 fallback for ffmpeg actually works) and a real Linux box, for all four tools
- Confirm the whisper.cpp source build succeeds with a typical fresh install's toolchain (Xcode Command Line Tools on macOS; `build-essential` + `cmake` on a mainstream Linux distro), and that the produced `whisper-cli` correctly finds its shared libraries at runtime
- Update the verification table at the top of `docs/philosophy/CROSS_PLATFORM.md` from "implemented" to "verified" per platform once confirmed, and fix whatever breaks
- Consider adding arm64 Linux support (`yt-dlp_linux_aarch64`, `ffmpeg-release-arm64-static.tar.xz` both exist upstream but aren't wired up yet)
- Consider a friendlier preflight error when whisper.cpp's build fails specifically because no C/C++ compiler is present (currently surfaces as a raw `cmake`/build error)

### Express route integration tests

**Shipped 2026-07-26** for the non-streaming routes that don't require a real network call or working tool binary (`GET /health`, `GET /api/ytdlp-status`, `POST /api/info` validation, `GET /api/validate-path`, `GET /api/transcribe/setup/check`, `GET /api/transcribe/models`, `GET /api/instagram/accounts`, `GET /api/proxy/img`) - see `backend/test/routes.test.js` and `docs/workflows/TESTING.md`. `backend/server.js` now exports its `app` for this purpose (ADR-013).

**Remaining work:** SSE routes (`/api/download`, `/api/setup`, `/api/transcribe/setup`, `/api/instagram/*download*`) are still manual-only, since they depend on the same real tool execution noted above.

### React component tests

**Shipped 2026-07-26** for `ProgressModal.jsx` (null render, single/bulk download states, done/failure/transcribe-button rendering) and the extracted `lib/urlCleaners.js` pure functions - see `docs/workflows/TESTING.md`.

**Remaining work:** extend coverage to other components as they're touched for other reasons - `VideoView.jsx`, `SettingsPage.jsx`, `InstagramLoginModal.jsx` are the next highest-value candidates (each has meaningful conditional rendering and state).

---

## Planned (Medium Priority)

### Shared `downloadFileWithProgress()` helper

All four tool managers currently duplicate a near-identical HTTPS-download-with-redirect-following-and-progress-callback function. Factor it into a shared `backend/utils/download.js` once a fifth consumer appears or a bug fix needs to be applied in more than one place at once (see `DECISIONS.md` ADR-003's trade-offs section) - premature extraction before that point isn't worth the abstraction cost.

### Centralized frontend `api.js`

Currently every component calls `fetch()` directly (see `DECISIONS.md` ADR-006). Revisit if the number of distinct backend endpoints grows substantially or if any shared request behavior (auth, base URL switching) is introduced.

### Redis-free progress persistence across app restarts

If the app is closed mid-download, the in-progress operation is lost with no resume capability. Investigate whether yt-dlp's own partial-download resume (`.part` files) can be surfaced as a "resume" option in the UI rather than starting over.

---

## Backlog (Lower Priority)

### Linux packaging beyond AppImage

Consider `deb`/`rpm` targets in addition to `AppImage` once the underlying cross-platform tool support (see above) is actually complete - no point expanding packaging formats for a build that doesn't yet work end-to-end.

### macOS code signing and notarization

The current `dmg` target is unsigned. Before wide distribution, macOS builds need a paid Apple Developer account, code signing, and notarization, or Gatekeeper will block every user from opening the app without a manual override.

### Playlist-aware batch download

`BatchResultsView.jsx` currently handles a manually pasted mixed queue of YouTube/Instagram URLs. A full playlist URL (`youtube.com/playlist?list=...`) is not yet a first-class input type distinct from a channel's `/videos` tab.

---

## Known Issues / Tech Debt

- **Tool managers' macOS/Linux paths are implemented but not yet verified on real hardware** - see `docs/philosophy/CROSS_PLATFORM.md`'s verification table. This is now the single largest remaining gap in the project (down from "not implemented at all").
- whisper.cpp's source-build path on macOS/Linux requires a full C/C++ toolchain the app cannot itself verify ahead of time - see `DECISIONS.md` ADR-012.
- ffmpeg's Linux extraction shells out to the system `tar` binary rather than a bundled library - a safe assumption on virtually every Linux distro, but not a guarantee (see `DECISIONS.md` ADR-011).
- macOS ffmpeg is x64-only; Apple Silicon runs it under Rosetta 2 rather than a native arm64 binary (deliberate trade-off, see `DECISIONS.md` ADR-011).
- yt-dlp and ffmpeg's Linux builds target x86_64 only; arm64 Linux is not wired up.
- `GET /api/dialog/folder` (backend/routes/info.js) shells out to PowerShell and is Windows-only, but only matters for the dev-only fallback path used when the frontend runs outside Electron - see `docs/philosophy/CROSS_PLATFORM.md`.
- Most React components other than `ProgressModal.jsx` have no test coverage yet - see `docs/workflows/TESTING.md`.
- SSE (streaming) routes have no automated coverage - see `docs/workflows/TESTING.md`.
- `console.log` startup banner in `backend/server.js` uses emoji markers, predating the writing standards in `docs/WRITING_STANDARDS.md`. Low priority cleanup - replace opportunistically when that file is next touched for another reason, not as a standalone change.
- No centralized frontend API client (see `DECISIONS.md` ADR-006) - acceptable at current scale, revisit if it grows.
- yt-dlp's pinned version (`YTDLP_VERSION` in `ytdlpManager.js`) was deliberately left unchanged in this pass to avoid destabilizing the verified-working Windows path while adding platform branching - bumping it to the current upstream release is a separate, routine maintenance task.
