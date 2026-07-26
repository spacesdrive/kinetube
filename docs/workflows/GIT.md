# Git Workflow

## Repository

- URL: https://github.com/spacesdrive/kinetube
- Default branch: `main`
- Author name: spacesdrive
- Author email: valzorx7@gmail.com

Commits in this repository use the spacesdrive author identity. The local git config for this repo is set to this - do not override it per-commit with a different author.

## Commit Cadence

Commit after every meaningful, self-contained change. Do not accumulate unrelated changes into one large commit. Do not leave work uncommitted between sessions.

A meaningful change is one that:
- Adds a working feature (even a small one)
- Fixes a bug
- Updates documentation to reflect a real change
- Refactors without changing behavior

Do not commit work-in-progress that breaks the build.

## Commit Message Format

Use Conventional Commits with an optional scope:

```
type(scope): short description in present tense

Optional body explaining WHY, not WHAT. Wrap at 72 characters.
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring, no behavior change |
| `style` | Formatting or whitespace, no logic change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependency updates, tooling |
| `release` | Version bump and changelog update |

### Scope (optional)

Use scope to name the area affected, matching this codebase's layers:

- `feat(transcribe):`
- `fix(ytdlp):`
- `fix(instaloader):`
- `docs(architecture):`
- `chore(deps):`
- `chore(release):`

### Subject line rules

- Present tense: "add" not "added", "fix" not "fixed"
- No period at the end
- Under 72 characters total including type and scope
- Lowercase after the colon
- No emojis, no em dashes

Do not add "Co-Authored-By" lines referencing AI tools. Commits should show only the project author.

### Examples

```
feat(whisper): stream partial transcription chunks over SSE

fix(ytdlp): handle yt-dlp exit code 1 with empty stdout as a soft failure

docs(architecture): document the SSE phase/progress/done/error contract

refactor(instaloader): extract 2FA process registry into its own map

test(urlParser): cover youtu.be and shorts URL variants

chore(deps): bump electron-updater to latest

release: v1.2.0 - transcription language auto-detect
```

## What to Commit Together

### Always group these in a single commit:
- A new route + its manager function(s) + the frontend call site that uses it
- A new component + its wiring into `App.jsx`
- A bug fix + updated docs if the fix changes documented behavior
- A new feature + `CHANGELOG.md` update + relevant architecture doc updates

### Never commit:
- `backend/.env` (if one is ever introduced)
- `backend/downloads/*.exe`, `*.dll`, `*.zip`, downloaded media
- `backend/models/*.bin`
- `backend/sessions/` contents (session cookies, `accounts.json`)
- `node_modules/`
- `dist/` build output
- Editor or OS metadata files (`.DS_Store`, `Thumbs.db`)

Check `.gitignore` covers all of the above before adding new writable-data paths anywhere in the tree.

## Documentation in Commits

Every feature commit must include documentation updates where `CLAUDE.md`'s Documentation Maintenance Policy table requires them. A feature is not complete until:
- `CHANGELOG.md` is updated (Unreleased section)
- Relevant architecture docs reflect the change

## Release Tagging

Tag releases after shipping a meaningful set of changes.

### Version numbering

| Change type | Version bump | Example |
|---|---|---|
| Bug fix | Patch: x.x.N+1 | v1.1.0 -> v1.1.1 |
| New feature | Minor: x.N+1.0 | v1.1.1 -> v1.2.0 |
| Breaking change | Major: N+1.0.0 | v1.2.0 -> v2.0.0 |

### Release process

See `docs/workflows/RELEASE.md` for the full packaging and GitHub Actions release flow - tagging `v*` is what triggers `.github/workflows/release.yml` to build and publish Windows/macOS/Linux artifacts.

```bash
git add CHANGELOG.md package.json
git commit -m "release: v1.2.0 - short description of release"
git tag -a v1.2.0 -m "v1.2.0 - short description"
git push origin main --tags
```

## Branch Strategy

Small changes and fixes go directly to `main`. For larger features spanning multiple sessions, use a feature branch:

```bash
git checkout -b feat/cross-platform-ytdlp
# work, commit incrementally
git push origin feat/cross-platform-ytdlp
# merge to main when ready
```

Delete the branch after merging:
```bash
git push origin --delete feat/cross-platform-ytdlp
git branch -d feat/cross-platform-ytdlp
```

## Pre-Commit Checklist

1. `cd backend && npm test` - backend tests pass
2. `cd frontend && npm test` - frontend tests pass
3. `cd frontend && npm run build` - frontend must build without errors
4. `cd frontend && npm run lint` - no lint errors
5. `git status` - verify only intended files are staged
6. `git diff --staged` - review the full diff before committing
7. Confirm no session cookies, downloaded binaries, or media files are staged
8. Verify `CHANGELOG.md` is updated if the commit adds a feature or fix
