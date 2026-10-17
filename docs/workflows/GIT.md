# Git workflow

## Repository

- URL: https://github.com/spacesdrive/kinetube
- Default branch: `main`
- Author name: spacesdrive
- Author email: valzorx7@gmail.com

Commits in this repository use the spacesdrive author identity. The local git config for this repository is already set to it. Do not override it per commit with a different author.

## GitHub issues

Work is tracked in GitHub issues at https://github.com/spacesdrive/kinetube/issues. Every piece of work starts with an issue and ends with that issue closed.

1. Open an issue before you start. The title names the outcome in plain words ("Folder picker fallback on macOS and Linux"). The body says what is wrong or missing and what done looks like.
2. Give it one label: `bug` for something broken, `enhancement` for a new feature or capability, `documentation` for docs only.
3. Reference the issue in every commit for it, in the commit body:
   - `Refs #<n>` while the work is in progress
   - `Closes #<n>` in the commit that finishes it
   - one commit can name several: `Closes #1, closes #3. Refs #2`
4. Close the issue once the finishing commit lands on the working branch. Add a comment that names the commit and the branch, says what changed, and says what was not verified.

GitHub closes an issue from `Closes #<n>` only when the commit reaches the default branch, `main`. Work on a branch such as `refactor/typescript-rest` needs the manual close in step 4.

```bash
gh issue create --title "Show toasts through Sonner" --label bug --body "..."
gh issue close 5 --comment "Implemented in cebb2c9 on refactor/typescript-rest: ... Not yet run on real macOS or Linux hardware."
```

## Commit cadence

Commit after every meaningful, self-contained change. Do not collect unrelated changes into one large commit, and do not leave work uncommitted between sessions.

A meaningful change is one that:

- Adds a working feature, even a small one
- Fixes a bug
- Updates documentation to match a real change
- Refactors without changing behavior

Do not commit work in progress that breaks the type check, the tests or the build.

## Commit message format

Use Conventional Commits with an optional scope:

```
type(scope): short description in present tense

Optional body explaining why, not what. Wrap at 72 characters.
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Restructured code with no behavior change |
| `style` | Formatting or whitespace, no logic change |
| `perf` | A performance improvement |
| `test` | Adding or updating tests |
| `build` | The toolchain, TypeScript setup or packaging config |
| `chore` | Maintenance, dependency updates, tooling |
| `release` | A version bump and changelog update |

### Scope

The scope is optional. It names the area the change touches. The history uses the layer names and a few feature names:

- Layers: `backend`, `frontend`, `electron`, `ci`, `release`, `build`
- Areas: `download`, `ytdlp`, `updater`, `managers`, `dev`, `ui`, `theme`

For example: `feat(backend):`, `fix(ci):`, `fix(download):`, `chore(frontend):`.

### Breaking changes

Mark a breaking change with `!` after the type or scope, and add a `BREAKING CHANGE:` footer that says what breaks:

```
refactor(backend)!: rewrite the backend in TypeScript with a versioned REST API

BREAKING CHANGE: every /api route changed. The frontend is updated in the
next commit.
```

### Subject line rules

- Present tense: "add", not "added"; "fix", not "fixed"
- No full stop at the end
- Under 72 characters, including the type and scope
- Lowercase after the colon
- No emoji, no em dashes

### Body

The body explains why the change was made and what a reader would not guess from the diff. Short bullet lists are fine for several related fixes. Name the ADR in `DECISIONS.md` when the change follows one. End the body with the issue reference (`Refs #2` or `Closes #5`), as described in "GitHub issues".

```
feat(backend): open the folder picker on macOS and Linux

osascript on macOS, zenity then kdialog on Linux. A missing tool
answers 501 with a message that says what to install.

Closes #5
```

Do not add `Co-Authored-By` lines that name AI tools. None of the commits in this repository have one; commits show only the project author.

### Examples

These are taken from the history of this repository:

```
feat(ytdlp): live update check against yt-dlp's latest GitHub release

fix(download): kill the whole yt-dlp process tree for Pause and Cancel

fix(dev): strip ELECTRON_RUN_AS_NODE before launching Electron in dev

build: add the TypeScript toolchain and the shared API types

refactor(electron)!: rewrite the main process and scripts in TypeScript

release: v1.6.0 - live yt-dlp update check and one-click update
```

## What to commit together

### Group these in one commit

- A new endpoint: its shared types in `shared/types/`, the route, validator, controller and service in `backend/src/`, the method in `frontend/src/services/api.ts`, the feature code that calls it, and its tests
- A new frontend feature folder and its wiring into `frontend/src/AppShell.tsx` or the download page
- A bug fix and the docs it changes, if the fix changes documented behavior
- A feature, its `CHANGELOG.md` entry and the architecture docs it changes

A change that spans layers can also be split by layer, as long as each commit leaves the type check and tests passing. The TypeScript rewrite was split into a shared-types commit, a backend commit, a frontend commit and an Electron commit, and the backend commit said that the frontend followed in the next one.

### Never commit

- `backend/.env` or any other `.env` file
- Tool binaries in `backend/downloads/`: `*.exe`, `*.dll`, `*.zip`, and on macOS and Linux the extensionless `yt-dlp`, `ffmpeg` and `whisper-cli`
- Downloaded media in `backend/downloads/`
- Whisper models in `backend/models/` (`*.bin`)
- `backend/sessions/` (Instagram session files and `accounts.json`)
- `backend/pending-downloads.json`
- `node_modules/`
- Build output: `dist/`, `backend/dist/`, `frontend/dist/`, `electron/dist/`, `shared/dist/`, `*.tsbuildinfo`
- Logs and editor or OS files (`*.log`, `.DS_Store`, `Thumbs.db`)

`.gitignore` covers this whole list, including the extensionless binaries and the `.so` and `.dylib` libraries that macOS and Linux create. Update `.gitignore` before you add a new writable path anywhere in the tree.

## Documentation in commits

Every feature commit includes the documentation updates that the Documentation Maintenance Policy table in `CLAUDE.md` asks for. A feature is not complete until:

- `CHANGELOG.md` has an entry under `[Unreleased]`
- The architecture docs match the change

## Release tagging

Tag a release after shipping a meaningful set of changes.

### Version numbering

| Change type | Version bump | Example |
|---|---|---|
| Bug fix | Patch | v1.6.0 to v1.6.1 |
| New feature | Minor | v1.6.1 to v1.7.0 |
| Breaking change | Major | v1.7.0 to v2.0.0 |

### Release process

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds and publishes the Windows, macOS and Linux installers. See `docs/workflows/RELEASE.md` for the full flow.

```bash
git add CHANGELOG.md package.json
git commit -m "release: v1.7.0 - short description of the release"
git tag -a v1.7.0 -m "v1.7.0 - Short description"
git push origin main --tags
```

The commit subject is lowercase after the colon. The tag message starts with a capital letter, as in the existing tags (`v1.6.0 - Live yt-dlp update check and one-click update`).

## Branch strategy

Small changes and fixes go straight to `main`. For a larger change that spans several sessions, use a branch named `type/short-topic`, such as `refactor/typescript-rest` or `feat/cross-platform-ytdlp`:

```bash
git checkout -b feat/cross-platform-ytdlp
# work and commit in small steps
git push origin feat/cross-platform-ytdlp
# merge into main when it is ready
```

Delete the branch after merging:

```bash
git push origin --delete feat/cross-platform-ytdlp
git branch -d feat/cross-platform-ytdlp
```

## Pre-commit checklist

1. `npm run typecheck` from the root: shared, Electron, backend and frontend all type check
2. `npm test` from the root: backend and frontend tests pass
3. `cd frontend && npm run lint`: no lint errors
4. `npm run build:frontend`: the frontend builds
5. `git status`: only the files you meant to change are staged
6. `git diff --staged`: review the whole diff
7. No session files, tool binaries, models or media are staged
8. `CHANGELOG.md` is updated if the commit adds a feature or a fix
9. The commit body names its issue with `Refs #<n>` or `Closes #<n>`

Do not use `npm run build` or `npm run build:backend` as a pre-commit check. They prune the backend's dev dependencies, and you would need `cd backend && npm install` before the next test run.
