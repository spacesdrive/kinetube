# Roadmap

Planned features, improvements, and known gaps. Items within each section are roughly prioritized, top items first.

Update this file whenever a feature ships (move to `CHANGELOG.md`) or when priorities change.

---

## In Progress

- None currently tracked.

---

## Next Up (High Priority)

### Verify cross-platform tool support on real macOS/Linux hardware

**Status as of 2026-07-26: implemented, not yet hardware-verified.** yt-dlp, ffmpeg, and whisper.cpp all now have platform-aware download/build logic (see `docs/philosophy/CROSS_PLATFORM.md` and `DECISIONS.md` ADR-011/ADR-012), and instaloader was confirmed already cross-platform via its existing pip/Python-module path (dead Windows-only exe code removed, see ADR-010). Everything was implemented from verified current documentation of each tool's real release assets and covered by unit tests for the pure platform-resolution logic. But this development environment is Windows-only, so none of the macOS/Linux code paths have actually been run end-to-end on real hardware yet.

**Remaining work:**
- Run the full setup flow on a real Mac (both Intel and Apple Silicon, to confirm the Rosetta 2 fallback for ffmpeg actually works) and a real Linux box, for all four tools
- Confirm the whisper.cpp source build succeeds with a typical fresh install's toolchain (Xcode Command Line Tools on macOS; `build-essential` + `cmake` on a mainstream Linux distro), and that the produced `whisper-cli` correctly finds its shared libraries at runtime
- Update the verification table at the top of `docs/philosophy/CROSS_PLATFORM.md` from "implemented" to "verified" per platform once confirmed, and fix whatever breaks
- Consider adding arm64 Linux support (`yt-dlp_linux_aarch64`, `ffmpeg-release-arm64-static.tar.xz` both exist upstream but aren't wired up yet)
- Consider a friendlier preflight error when whisper.cpp's build fails specifically because no C/C++ compiler is present (currently surfaces as a raw `cmake`/build error)

### Express route integration tests

**Shipped 2026-10-17 for every route.** `backend/tests/routes/apiRoutes.test.ts` drives the whole `/api/v1` API with supertest against fake tool managers (`backend/tests/fixtures/fakeManagers.ts`), including the streaming routes, which 1.x could only check by hand. A real yt-dlp, FFmpeg or whisper.cpp run is still a manual check (`docs/workflows/TESTING.md`).

### React component tests

**Shipped 2026-10-17.** Vitest and Testing Library cover the progress modal, the resume banner, the stream reader, the request client, the download and transcription reducers and the URL cleaners (`frontend/tests/`). The redesign added tests for the command palette, the hold-to-confirm button, theme switching, command filtering, collection filters and quality availability.

**Remaining work:** cover `SettingsPage`, the Instagram login dialog and the media views as they change for other reasons.

### Log in to Instagram for post downloads again

yt-dlp cannot read instaloader's session file, so post lookups and downloads run logged out (`DECISIONS.md` ADR-030). Private posts and posts Instagram hides from logged-out visitors fail. A small Python helper could export the session's cookies to a Netscape cookie file for yt-dlp.

---

## Planned (Medium Priority)

### Shared `downloadFileWithProgress()` helper

**Shipped 2026-07-27.** The yt-dlp and whisper.cpp managers (now under `backend/src/managers/ytdlp/` and `backend/src/managers/whisper/`) both import a single implementation, now `backend/src/lib/httpDownload.ts`, unifying two copies that had already drifted. Whisper's copy was more robust (`http:` redirect support, a `settled` guard, response-error cleanup) and is now what both managers get. See `DECISIONS.md` ADR-015 and `backend/tests/lib/httpDownload.test.ts`.

### One frontend API client

**Shipped 2026-07-27, finished 2026-10-17.** Every request, including streams, now goes through `frontend/src/services/api.ts` (`DECISIONS.md` ADR-027).

### Resume a download interrupted by the app closing

**Shipped 2026-07-27** for single-video YouTube downloads. The pending-download store (now `backend/src/stores/pendingDownloadStore.ts`) records an in-flight download's request and clears it on any normal end (success, failure, cancel); a record surviving to the next launch means the app itself was killed mid-download. The resume banner (now `frontend/src/features/downloads/ResumeDownloadsBanner.tsx`) offers to resume it, re-issuing the identical request so yt-dlp's own `--continue` behavior picks up the partial file. See `DECISIONS.md` ADR-017.

**Live Pause/Resume, shipped 2026-07-27.** The progress modal (now `frontend/src/features/downloads/ProgressModal.tsx`) has a Pause button during an active single-video download (now `POST /api/v1/downloads/:downloadId/pause`) and a Resume button once paused. It uses the same kill-and-continue mechanism as the crash-recovery resume above, just triggered explicitly instead of by the app closing. See `DECISIONS.md` ADR-020.

**Remaining work:**
- Instagram downloads can be paused and resumed since 2026-10-17 (ADR-031). Batches still cannot: resuming one needs the queue position and the state of each item, not just one request
- No verification yet that yt-dlp's resume actually re-attaches to a `.part` file compared to just re-downloading from 0%. It is on the manual checklist in `docs/workflows/TESTING.md`, but not yet confirmed on a real large download
- If the user changes their download folder in Settings between the interrupted attempt and clicking Resume, the resume still targets the *original* folder (correct for the underlying `.part` file, but potentially surprising). Consider surfacing the target folder in the banner

---

## Backlog (Lower Priority)

### Linux packaging beyond AppImage

Consider `deb`/`rpm` targets in addition to `AppImage` once the underlying cross-platform tool support (see above) is actually complete. There is no point expanding packaging formats for a build that doesn't yet work end-to-end.

### macOS code signing and notarization

The current `dmg` target is unsigned. Before wide distribution, macOS builds need a paid Apple Developer account, code signing, and notarization, or Gatekeeper will block every user from opening the app without a manual override.

### Playlist-aware batch download

**Shipped 2026-10-17** (issue #2, `DECISIONS.md` ADR-034). Playlist links list every video to pick from, on the YouTube page and in Batch download, and channels have Videos, Shorts, Live and Playlists tabs.

**Remaining work:** lists render every row at once. A channel Live tab with 597 streams stays smooth, but a channel with several thousand videos may want a virtualised list.

### Keep the brand kit out of the build

`frontend/public/kinetube-brand-kit/` is copied into `frontend/dist` and the installer, about 400 KB the app never loads. Moving the kit to `docs/brand/` would keep it in the repository without shipping it.

### Pause and resume for batches

Single YouTube and Instagram downloads can be paused. A batch cannot, because the pending-download records track one request each, not a queue position and the state of each item (`DECISIONS.md` ADR-017 and ADR-020).

### CI check for release-asset name consistency

**Added 2026-07-26**, following the v1.3.0 auto-update 404 (`DECISIONS.md` ADR-014). The fix (pinning `nsis.artifactName`) is in place, but nothing in CI would catch a future regression, such as a new Windows target whose `artifactName` reintroduces a space. Add a post-build CI step that parses each uploaded `latest*.yml` and confirms its referenced filename(s) exactly match the filenames actually present in the release assets, failing the workflow if not, instead of relying on the manual check in `docs/workflows/RELEASE.md`'s "Cutting a Release" checklist.

---

## Known Issues / Tech Debt

- **Tool managers' macOS/Linux paths are implemented but not yet verified on real hardware.** See the verification table in `docs/philosophy/CROSS_PLATFORM.md`. This is now the single largest remaining gap in the project (down from "not implemented at all").
- whisper.cpp's source-build path on macOS/Linux requires a full C/C++ toolchain the app cannot itself verify ahead of time. See `DECISIONS.md` ADR-012.
- ffmpeg's Linux extraction shells out to the system `tar` binary rather than a bundled library. That is a safe assumption on almost every Linux distribution, but not a guarantee (see `DECISIONS.md` ADR-011).
- macOS ffmpeg is x64-only; Apple Silicon runs it under Rosetta 2 rather than a native arm64 binary (deliberate trade-off, see `DECISIONS.md` ADR-011).
- yt-dlp and ffmpeg's Linux builds target x86_64 only; arm64 Linux is not wired up.
- `POST /api/v1/folders/pick` uses PowerShell on Windows, osascript on macOS and zenity or kdialog on Linux (issue #5). Only Windows has been run for real; the other two are covered by tests with a fake process runner. Only the dev fallback outside Electron uses it. See `docs/philosophy/CROSS_PLATFORM.md`.
- Several larger components (`SettingsPage`, the Instagram login dialog, the media views) have no tests yet. See `docs/workflows/TESTING.md`.
- The pending-download store (`backend/src/stores/pendingDownloadStore.ts`) never prunes a record whose output folder has since been deleted. A stale "Resume" entry fails when clicked instead of being filtered out first. Low priority: the failure shows up as a normal, visible error.
- yt-dlp's pinned version (`YTDLP_VERSION` in `backend/src/managers/ytdlp/ytdlpBinary.ts`) is still unbumped. It is the release used for the first install and for the "outdated" warning. A person does not have to wait for a bump: Settings can check yt-dlp's latest GitHub release and install it in place (`DECISIONS.md` ADR-022). Bumping the pin is routine maintenance.
- The vendored shadcn `frontend/src/components/ui/sidebar.tsx` is about 680 lines. It is upstream code, so it was converted to TypeScript but not split.
