# TypeScript standards

The backend, frontend, Electron main process and shared types are strict TypeScript 6.0 (ADR-023). The helper scripts in `scripts/` are TypeScript too (`.mts`). Only `frontend/eslint.config.js` is still JavaScript. Write new code in `.ts`, or `.tsx` for React, and match the settings below.

## Compiler settings

Every project turns on `strict` and `erasableSyntaxOnly`. The rest differs by project:

| Setting | `backend/` | `frontend/` app | `electron/` | `shared/` |
|---|---|---|---|---|
| `module` / `moduleResolution` | `nodenext` | `esnext` / `bundler` | `nodenext` | `nodenext` |
| `strict` | yes | yes | yes | yes |
| `erasableSyntaxOnly` | yes | yes | yes | yes |
| `noUncheckedIndexedAccess` | yes | yes | yes | no |
| `verbatimModuleSyntax` | yes | yes | no | yes |
| `allowImportingTsExtensions` | yes | yes | no | yes |
| `rewriteRelativeImportExtensions` | yes | no | no | yes |
| `noFallthroughCasesInSwitch` | yes | yes | no | no |
| `noImplicitOverride` | yes | no | no | no |

The backend settings live in `backend/tsconfig.base.json`. `backend/tsconfig.json` type-checks `src/` and `tests/`, and `backend/tsconfig.build.json` compiles `src/` to `dist/`. The frontend app settings are in `frontend/tsconfig.app.json`, and `frontend/tsconfig.node.json` covers `vite.config.ts` and `eslint.config.js`.

`npm run typecheck` at the root checks `shared`, `electron`, `backend` and `frontend`. The two scripts in `scripts/*.mts` are not in any `tsconfig`, so it does not check them.

### Erasable syntax only

In development, Node 22.18 runs the backend's `.ts` files directly by deleting the types. `erasableSyntaxOnly` makes the compiler refuse any syntax that cannot simply be deleted:

- no `enum`: use a union of string literals, such as `type DownloadStatus = 'active' | 'paused' | 'interrupted'`
- no `namespace` with values
- no constructor parameter properties (`constructor(private name: string)`)
- no `import x = require(...)`

For a list of allowed values, keep a `readonly` array next to the union, as `VIDEO_QUALITIES` in `backend/src/managers/ytdlp/ytdlpFormats.ts` does.

## Types to avoid

- **No `any`.** Use `unknown` and narrow it. The codebase has no `any` today.
- No `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`.
- No non-null assertions (`value!`). Check for `null` or `undefined`, or use `??` with a fallback.
- No classes except for errors. Services, managers, stores and controllers are factory functions that return an object typed by an interface (`createDownloadService(): DownloadService`).

## Imports

- Use `import type` for anything used only as a type. `verbatimModuleSyntax` keeps a plain `import` in the output, so a type in a plain import fails at runtime in the backend. The frontend lint rule `@typescript-eslint/consistent-type-imports` enforces it there.
- Backend relative imports end in `.ts`: `import { createApp } from './app.ts';`. Node needs the real file name, and the build rewrites it to `.js`.
- Frontend relative imports have no extension: `import { openStream } from './eventStream';`. Vite resolves them.
- Electron imports have no extension, because they compile to CommonJS.
- Builtin Node modules use the `node:` prefix: `import path from 'node:path';`.

Group imports in this order, with a blank line between groups:

1. Node builtins
2. packages
3. local values (`@/...` and `./...` in the frontend)
4. all `import type` lines

```ts
import path from 'node:path';

import express from 'express';

import { createApiRouter } from './routes/apiRouter.ts';

import type { Express } from 'express';
import type { AppConfig } from './config.ts';
```

## Shared types

`shared/types/` holds the request, response and stream-event types the backend and frontend agree on, and the Electron bridge type (ADR-028). Nothing else goes there: no functions, no constants.

| File | Holds |
|---|---|
| `api.ts` | `DataResponse`, `ListResponse`, `ErrorResponse`, `ErrorCode`, `StreamDone` and the shared event shapes |
| `tools.ts`, `youtube.ts`, `instagram.ts`, `downloads.ts`, `transcriptions.ts`, `folders.ts` | The types for each API resource |
| `electron.ts` | `ElectronApi` and `UpdateStatus` |

The backend and frontend import them through the `@shared/*` path alias, with the `.ts` extension: `import type { Download } from '@shared/downloads.ts';`. Electron imports `shared/types/electron.ts` by relative path. These imports are always `import type`, so the shared folder never exists at runtime.

When a route's request, response or events change, change the shared type first. The compiler then points at every place in both projects that has to follow.

## Return types

Exported backend and Electron functions declare their return type:

```ts
export function readConfig(env: NodeJS.ProcessEnv, backendRoot: string): AppConfig {
```

Two kinds of frontend function leave it to inference:

- React components return JSX.
- Hooks return an object that callers type with `ReturnType<typeof useX>`, for example `export type MediaLookup = ReturnType<typeof useMediaLookup>;`.

Other exported frontend functions declare it, as `applyDownloadEvent(...): SingleDownloadState` does. `cn` in the generated `lib/utils.ts` is the one exception.

## Untrusted data: `unknown` and one narrow cast

Anything that comes from outside the program arrives as `unknown`: request bodies and query values, `JSON.parse` results, files on disk, tool output, and `catch` variables.

- Backend validators take `unknown` and check each field with the helpers in `backend/src/validators/fields.ts` (`readObject`, `requiredString`, `optionalBoolean`, `oneOf` and others). They return a typed request or throw `ValidationError`.
- `isRecord` (`backend/src/lib/lineSplitter.ts`) narrows `unknown` to `Record<string, unknown>`.
- In a `catch`, narrow before reading a message. The backend uses `errorMessage(error)` from `lib/errors.ts`.

When a cast cannot be avoided, make one cast at the edge, after the checks, with a comment that says why it is safe. `request<T>` in `frontend/src/services/request.ts` is the model:

```ts
// the response type is the shared contract for this route, so the parsed body is trusted to match it
return (await response.json()) as T;
```

`as unknown as` appears three times in the codebase, each with a comment: the failed `done` event in `controllers/http.ts` and `services/eventStream.ts`, and `readDownloadRecord` in `stores/downloadRecord.ts`. Do not add more without the same kind of reason.

## Checking responses with `satisfies`

Controllers check each JSON body against its shared type with `satisfies`, without widening it:

```ts
res.json(listResponse(downloadList) satisfies ListResponse<Download>);
```

If the service's return type drifts from the contract, this line stops compiling.

## Naming

See `docs/guidelines/NAMING.md` for file, function, type and route names. In short:

- `camelCase` for variables and functions, `PascalCase` for types, interfaces and React components
- `SCREAMING_SNAKE_CASE` for module-level constants: `KEEP_ALIVE_MS`, `HEALTH_CHECK_ATTEMPTS`, `UNEXPECTED_ERROR_MESSAGE`
- booleans start with `is`, `has`, `can`, `should` or `will`: `isInstalled`, `hasSession`, `willMerge`
- a unit in the name when a number has one: `timeoutMs`, `totalBytes`, `sizeMb`

## Comments

Write a comment only when the reason behind the code is not clear from the code. Explain a hidden constraint, an outside tool's behavior, or a choice that would surprise a reader.

- One line, in lowercase unless it starts with a name, with no full stop at the end.
- Say why, not what.
- No JSDoc and no block comments.
- Do not mention the current task, a ticket or a pull request.

```ts
// a failed update must leave the working binary in place, so the new one is swapped in only when complete
const partialPath = `${binaryPath}.download`;
```

```ts
// StrictMode mounts twice in development; a second install request would only get a 409
const hasStartedRef = useRef(false);
```

## Small modules

- Aim for files of about 150 lines or less. Split by job when a file grows past that. Today the longest source file is `frontend/src/AppShell.tsx` at 124 lines.
- Aim for functions of about 40 lines or less. Move a named step into its own function.
- One job per file. The backend splits a feature into a route table, a controller, a validator, a service and helpers in a folder named after the feature (`services/downloads/`).

## Formatting

There is no Prettier config. Match the code as it is:

- single quotes
- semicolons
- 2-space indentation
- trailing commas in multi-line lists and calls
- `const` by default, `let` only when the value is reassigned, never `var`
- `===` and `!==`, never `==` or `!=`
- template literals for building strings
- `async`/`await` instead of `.then()` chains, except for short calls whose promise is not awaited

Lines can be long. A short statement stays on one line instead of being wrapped.

The files in `frontend/src/components/ui/` are generated by shadcn and keep its formatting (double quotes, some lines without semicolons). Leave them as generated.

## Linting

Only the frontend has a linter: `npm run lint` in `frontend/` runs ESLint 9 with `@eslint/js` recommended, `typescript-eslint` strict, `eslint-plugin-react-hooks` recommended and `eslint-plugin-react-refresh`. Unused variables are errors unless the name starts with `_`. The backend and Electron rely on `tsc` alone.

## Errors

- Backend code throws an `AppError` subclass for every expected failure (`ValidationError`, `NotFoundError`, `ConflictError` and others in `lib/errors.ts`). The error handler turns it into the JSON error shape.
- After a stream has opened, a failure is a `done` event with `success: false`, not an exception.
- Frontend code gets an `ApiError` from the API client, or a failed `done` event from a stream, and shows its message.

See `docs/guidelines/ERROR_HANDLING.md` for the full pattern.

## No unused code

Do not leave unused variables, unused imports or commented-out code.

## Platform assumptions

The managers take a `platform` argument (default `process.platform`) and pick the binary name and download per platform. Do not add a hardcoded `.exe` suffix, a Windows-only path or a `win32`-only branch without reading `docs/philosophy/CROSS_PLATFORM.md` first. If the gap cannot be avoided yet, record it there.
