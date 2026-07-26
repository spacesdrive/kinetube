# MCP Usage - Decision Guide

## Quick Decision Tree

```
Need API/library docs (Express, React, Electron, electron-builder, multer)?
    -> Context7

Need to find a file, symbol, or understand the codebase across many files?
    -> Filesystem (or direct Grep/Glob for a single known target)

Need to plan a change spanning manager + route + frontend, or a cross-platform fix?
    -> Sequential Thinking

Need current info on a tool's release assets, packaging requirements, or UX patterns?
    -> Parallel Search
```

## When Each MCP Is Right

| MCP | Use it for | Do not use it for |
|---|---|---|
| **Context7** | Express 5 API, React 19 hooks, Electron `BrowserWindow`/`utilityProcess`/`ipcMain`, `electron-updater`/`electron-builder` config, `multer`, `unzipper`, shadcn component props | Debugging business logic, code review, general programming |
| **Filesystem** | Finding every file that imports a manager, directory trees, multi-file reads for a refactor | Writing code, single known-path reads (use Read) |
| **Sequential Thinking** | Planning a feature that touches a manager + a route + the frontend; planning how to make a manager cross-platform | Simple lookups (use Context7), single-file edits |
| **Parallel Search** | Current yt-dlp/ffmpeg/whisper.cpp/instaloader release asset conventions, macOS notarization/Linux packaging requirements, UX patterns for progress UI | Library API docs (use Context7), codebase exploration (use Filesystem) |

## Workflow Example: Making yt-dlp Cross-Platform

1. **Sequential Thinking** - plan the change across `ytdlpManager.js`, the routes that spawn it, and the manual test checklist
2. **Parallel Search** - confirm the current asset names published on yt-dlp's GitHub releases for macOS/Linux, and whether `chmod +x` plus any Gatekeeper quarantine step is needed on macOS
3**Context7** - not usually needed for this one, since yt-dlp isn't an npm-documented library; skip if nothing new is being learned from it
4. Implement following `docs/features/NEW_TOOL_MANAGER.md`
5. Update `docs/philosophy/CROSS_PLATFORM.md`'s Tracked Gap List

## Detailed Docs

- `docs/mcp/CONTEXT7.md` is not currently maintained as a separate file in this project - the global Context7 usage rule already loaded into every session (see the user's `context7.md` rule) covers when and how to use it; this overview exists only to route KineTube-specific decisions among the four MCPs available in this environment (Context7, Filesystem, Sequential Thinking, Parallel Search).
