# Guide: adding an API route

Use this guide to add a route to the backend's `/api/v1` API. Read `docs/architecture/backend/EXPRESS.md` (the layers) and `docs/architecture/backend/ROUTES.md` (the envelope and the stream contract) first.

The steps below use one example throughout: `DELETE /api/v1/whisper-models/:modelId`, which would delete a downloaded model and answer 204. This route does not exist; it only shows where each piece goes. Each step names the real files it would touch.

For a streaming route, copy `POST /api/v1/whisper-models/:modelId/download` instead. It goes through the same files.

## Files to change

| Step | File | Example |
|---|---|---|
| 1 | `shared/types/<resource>.ts` | `shared/types/transcriptions.ts` |
| 2 | `backend/src/validators/<resource>Validators.ts` | `backend/src/validators/transcriptionValidators.ts` |
| 3 | `backend/src/services/<resource>Service.ts` | `backend/src/services/whisperModelService.ts` |
| 4 | `backend/src/controllers/<resource>Controller.ts` | `backend/src/controllers/transcriptionController.ts` |
| 5 | `backend/src/routes/<resource>Routes.ts` | `backend/src/routes/transcriptionRoutes.ts` |
| 6 | `backend/src/routes/apiRouter.ts` and `backend/src/container.ts` | only for a new resource or service |
| 7 | `frontend/src/services/api.ts` | one entry per endpoint |
| 8 | `backend/tests/routes/apiRoutes.test.ts`, `backend/tests/services/<resource>Service.test.ts` | |
| 9 | `docs/architecture/backend/ROUTES.md`, `docs/api/openapi.yaml`, `docs/workflows/TESTING.md`, `CHANGELOG.md` | |

## Step 1: write the shared type first

Every request body, response `data` and stream event has a type in `shared/types/`. The backend and the frontend both import it with `import type`, so the contract is written once. Write it before any backend code.

- A request body is an interface named `Create<Thing>Request` or `<Verb><Thing>Request`, such as `CreateTranscriptionRequest`.
- A response is the resource itself, such as `WhisperModel`. The envelope (`DataResponse<T>`, `ListResponse<T>`) comes from `shared/types/api.ts`; never repeat it.
- A stream has an events interface whose last member is `done: StreamDone<{ ... }>`, such as `ModelDownloadEvents`.

The delete example answers 204 with no body, so it needs no new type. A route that returns a new shape adds it here:

```ts
// shared/types/transcriptions.ts
export interface WhisperModel {
  id: WhisperModelId;
  label: string;
  sizeMb: number;
  isDownloaded: boolean;
}
```

## Step 2: validate the input

A validator turns untrusted `req.params`, `req.query` or `req.body` into a typed value, or throws. Use the helpers in `backend/src/validators/fields.ts` (`readObject`, `requiredString`, `optionalString`, `optionalBoolean`, `optionalInteger`, `oneOf`, `optionalOneOf`, `queryValue`). Throw `ValidationError` (400) for bad input and `NotFoundError` (404) for an id that cannot exist.

The example reuses `parseModelId()`, which already exists:

```ts
// backend/src/validators/transcriptionValidators.ts
export function parseModelId(value: unknown): WhisperModelId {
  const modelId = WHISPER_MODEL_IDS.find((candidate) => candidate === value);
  if (!modelId) throw new NotFoundError(`There's no whisper model called "${String(value)}".`);
  return modelId;
}
```

Validators never touch the disk, spawn processes or call services. Every link must go through a parser in `backend/src/platforms/` (for example `parseDownloadTarget()`), and every Instagram username through `parseUsername()`.

## Step 3: put the rule in a service

The service holds the business rule and throws a typed error from `backend/src/lib/errors.ts` when the request cannot go ahead. It never reads `req` or `res`.

```ts
// backend/src/services/whisperModelService.ts
export interface WhisperModelService {
  list(): WhisperModel[];
  get(modelId: WhisperModelId): WhisperModel;
  download(modelId: WhisperModelId): StreamJob<ModelDownloadEvents>;
  remove(modelId: WhisperModelId): void;
}

// inside createWhisperModelService(whisper)
remove(modelId) {
  if (lock.isHeld(modelId)) throw new ConflictError(`The ${modelId} model is downloading. Wait for it to finish, then try again.`);
  if (!whisper.isModelDownloaded(modelId)) throw new NotFoundError(`The ${modelId} model isn't downloaded.`);
  whisper.removeModel(modelId);
},
```

If the rule needs a tool (yt-dlp, FFmpeg, whisper.cpp, instaloader), add a method to its manager rather than spawning anything here. In the example, `removeModel()` would be a new `WhisperManager` method. See `NEW_TOOL_MANAGER.md`.

For a streaming route, the service returns a `StreamJob<Events>` (`backend/src/services/streamJob.ts`). Do every check, and take any lock, before returning the job, so a bad request gets a plain JSON error instead of a stream. The job sends its own `done` event. `whisperModelService.download()` shows the full pattern: claim the lock, return the job, send `done` in `try` and `catch`, release the lock in `finally`.

## Step 4: add the controller handler

A controller handler validates, calls one service method, and sends the answer. It never catches: Express 5 passes a thrown error to the error handler, which writes the JSON error.

```ts
// backend/src/controllers/transcriptionController.ts
removeModel(req, res) {
  models.remove(parseModelId(req.params.modelId));
  res.status(204).end();
},
```

How to answer:

| Answer | Code |
|---|---|
| One item | `res.json(dataResponse(item) satisfies DataResponse<Thing>)` |
| A list | `res.json(listResponse(items) satisfies ListResponse<Thing>)` |
| Created | `res.status(201).json(dataResponse(item) satisfies DataResponse<Thing>)` |
| No content | `res.status(204).end()` |
| A stream | `await sendStream(req, res, logger, job)` |

`dataResponse`, `listResponse` and `sendStream` come from `backend/src/controllers/http.ts`. Add the handler's name to the controller's interface (`TranscriptionController`).

## Step 5: register the route

Add one line to the resource's route table:

```ts
// backend/src/routes/transcriptionRoutes.ts
export function createWhisperModelRoutes(controller: TranscriptionController): Router {
  const router = Router();

  router.get('/', controller.listModels);
  router.get('/:modelId', controller.getModel);
  router.post('/:modelId/download', controller.downloadModel);
  router.delete('/:modelId', controller.removeModel);

  return router;
}
```

Rules for paths:

- Name the path after the resource, in plural kebab case (`whisper-models`, `download-batches`).
- Reads are GET. Actions are POST to a sub-path (`/:downloadId/pause`). Deletes are DELETE and answer 204.
- Register fixed paths before parameter paths, as `toolRoutes.ts` does with `/ytdlp/releases/latest` before `/:toolId`.
- A multipart route adds `acceptUpload` before the handler, as `createTranscriptionRoutes()` does.

## Step 6: mount a new resource

Skip this step when the route joins an existing table. For a new resource:

1. Add the service to the `Services` interface and to `createServices()` in `backend/src/container.ts`.
2. Create its controller and route table in `createApiRouter()` in `backend/src/routes/apiRouter.ts`, and mount it with `router.use('/<resource>', ...)`.

## Step 7: add the frontend call

Every request goes through `frontend/src/services/api.ts` (ADR-027). Components never call `fetch`.

```ts
// frontend/src/services/api.ts
removeWhisperModel: (modelId: WhisperModelId) => requestNoContent(`/whisper-models/${modelId}`, { method: 'DELETE' }),
```

Use `request<T>()` for JSON, `requestNoContent()` for 204, and `openStream()` for a stream. A failed request throws an `ApiError` with the backend's message (see `docs/guidelines/ERROR_HANDLING.md`).

## Step 8: write the tests

Backend tests use `node:test` and mirror `src/`. Run them with `npm test` in `backend/`.

Route test, in `backend/tests/routes/apiRoutes.test.ts`. The app is built with fake managers from `backend/tests/fixtures/fakeManagers.ts` and a temp data folder from `tests/fixtures/tempDir.ts`. Every request goes through the `api` helper, which sets the `Host` header the origin guard expects:

```ts
test('deleting a model that is not downloaded is a 404', async () => {
  const res = await api.delete('/api/v1/whisper-models/large');
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'NOT_FOUND');
});
```

Service test, in `backend/tests/services/whisperModelService.test.ts`. Call the service directly with fake managers and check the thrown error by name:

```ts
test('a model cannot be deleted while it downloads', () => {
  const service = createWhisperModelService(createFakeWhisper());
  service.download('base');
  assert.throws(() => service.remove('base'), { name: 'ConflictError' });
});
```

For a stream, parse the response body with `parseSseBody()` from `tests/fixtures/sseEvents.ts` and check that the last event is `done`. `tests/services/toolService.test.ts` shows how to collect events from a job without HTTP.

Then run the full checks from the project root:

```bash
npm run typecheck
npm test
```

To try the route by hand, start the backend with `npm run dev` and call it with curl. curl sends `Host: localhost:3001` and no `Origin`, so the origin guard lets it through:

```bash
curl -i -X DELETE http://localhost:3001/api/v1/whisper-models/tiny
```

## Step 9: update the docs

- `docs/architecture/backend/ROUTES.md`: add the row with method, path, purpose, success status, error statuses and whether it streams.
- `docs/api/openapi.yaml`: add the path, and any new schema under `components/schemas` exactly as in `shared/types/`.
- `docs/workflows/TESTING.md`: add a manual check if the route is reachable from the UI.
- `CHANGELOG.md`: add a line under Unreleased.

## Checklist

- [ ] The shared type exists and both sides import it with `import type`.
- [ ] Every input goes through a validator; links go through a platform parser.
- [ ] The service throws typed errors with a message that says what failed and what to do.
- [ ] A streaming service runs its checks and locks before it returns the job, and the job always sends `done`.
- [ ] The controller does not catch.
- [ ] No tool binary is spawned outside a manager.
- [ ] Nothing assumes Windows (`.exe`, `win32`, a Windows path) without checking `docs/philosophy/CROSS_PLATFORM.md`.
- [ ] Route and service tests pass, and `npm run typecheck` is clean.
- [ ] `ROUTES.md` and `openapi.yaml` match the code.
