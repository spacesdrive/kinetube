# JavaScript Standards

This project is plain JavaScript/JSX - no TypeScript. The backend and frontend use different module systems; do not mix them.

## Module System

- **Backend (`backend/`):** CommonJS (`"type": "commonjs"` in `backend/package.json`). Use `require()`/`module.exports`. Do not introduce `import`/`export` here.
- **Frontend (`frontend/`):** ES modules via Vite (`"type": "module"`). Use `import`/`export`. Do not use `require()` here.
- **Electron (`electron/`):** CommonJS, matching the root `package.json` (no `"type": "module"` set there).
- **Scripts (`scripts/`):** CommonJS, matching root.

## File Conventions

- Backend route files: `camelCase.js` - `download.js`, `transcribe.js`, `instagram.js`
- Backend util/manager files: `camelCase.js` - `ytdlpManager.js`, `whisperManager.js`, `paths.js`
- Frontend utility/hook files: `camelCase.js` - `utils.js`, `use-mobile.js`
- Frontend React files: `PascalCase.jsx` - `VideoView.jsx`, `SettingsPage.jsx`
- shadcn generated files: `kebab-case.jsx` - do not rename these

## Comments Policy

Write no comments by default. Add a comment only when the WHY is non-obvious and cannot be expressed in naming alone: a hidden constraint, a surprising invariant, a workaround for a specific external bug or tool behavior.

**Do not write:**
- Comments explaining what the code does (naming does that)
- Comments referencing the current task or PR
- Multi-line comment blocks
- JSDoc, except sparingly on manager functions with genuinely non-obvious parameters

**Do write (sparingly), matching the existing style in this codebase:**
```js
// whisper.cpp renames 'main.exe' to 'whisper-cli.exe' from v1.7 onwards.
// We check both after extraction.
const WHISPER_EXE_CANDIDATES = [...];
```

```js
// Hold a module-level reference so the server keeps the Node event loop alive
// and cannot be garbage collected while the process is running.
let _server;
```

## Naming

- Functions: `camelCase` - `getYtdlpPath`, `checkYtdlpStatus`, `parseInstagramUrl`
- Variables: `camelCase` - `downloadsDir`, `modelName`, `accessToken`
- Constants: `SCREAMING_SNAKE_CASE` for true module-level constants - `YTDLP_VERSION`, `WHISPER_ZIP_URL`, `DOWNLOADS_DIR`
- React components: `PascalCase` - `ProgressModal`, `TranscribePage`

Prefer names that describe intent, not implementation:
- `getModelPath` not `resolveGgmlFile`
- `ensureWhisper` not `downloadAndExtractZip`

## Error Handling

In **Express route handlers**, catch and respond explicitly - do not let errors fall through to a generic response body (see `docs/guidelines/ERROR_HANDLING.md` for the full pattern, including the SSE `error` event shape used by streaming routes).

In **manager functions**, prefer emitting an `onEvent('phase', { phase: 'error', message })` over throwing where the caller is a streaming route, and throwing a descriptive `Error` where the caller is a plain request/response route (`ensureYtDlp()` returns a boolean and logs; `transcribeFile()` throws).

In **frontend components**, catch fetch errors and surface them via the existing alert/banner components (`YtdlpAlert.jsx`) or inline error state - never leave a rejected promise unhandled.

## Async/Await

Use `async/await` everywhere. Avoid raw `.then()/.catch()` chains except for brief, genuinely clearer one-liners.

## Variable Declarations

Use `const` by default. Use `let` only when reassigned. Never use `var`.

## Equality

Always use `===` and `!==`. Never `==` or `!=`.

## String Formatting

Use template literals for all string interpolation:
```js
const url = `${HF_BASE}/${MODELS[modelName].file}`;
```

## Object Patterns

Prefer destructuring and optional chaining/nullish coalescing, matching existing code:
```js
const { text, outputTxt } = await transcribeFile(inputPath, modelName, onEvent, opts);
const threads = opts.threads || Math.max(1, Math.floor(os.cpus().length / 2));
```

## No Unused Code

Do not leave unused variables, unused imports, or commented-out code blocks. Remove them.

## Platform Assumptions

Do not add a new hardcoded `.exe` suffix, Windows-only spawn path, or `win32`-only branch without reading `docs/philosophy/CROSS_PLATFORM.md` first and recording the gap there if it's unavoidable for now. This is the single most common way this codebase silently regresses cross-platform support.
