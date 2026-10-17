import fs from 'node:fs';

import { downloadFileWithProgress } from '../../lib/httpDownload.ts';
import { MIN_MODEL_BYTES, modelDownloadUrl, modelPath } from './whisperModels.ts';

import type { ModelDownloadEvents, WhisperModelId } from '@shared/transcriptions.ts';
import type { EventSink } from '../../lib/sse.ts';

export type ModelEventSink = EventSink<Omit<ModelDownloadEvents, 'done'>>;

// a model counts as downloaded once its file exists, so it only gets its real name when complete
export async function downloadWhisperModel(modelsDir: string, modelId: WhisperModelId, send: ModelEventSink): Promise<void> {
  const destination = modelPath(modelsDir, modelId);
  if (fs.existsSync(destination)) {
    send('phase', { modelId, phase: 'done', message: `The ${modelId} model is already downloaded`, isSkipped: true });
    return;
  }

  const partialPath = `${destination}.download`;
  send('phase', { modelId, phase: 'downloading', message: `Downloading the ${modelId} model...`, isSkipped: false });
  await downloadFileWithProgress(modelDownloadUrl(modelId), partialPath, (progress) => send('progress', { modelId, ...progress }));

  if (fs.statSync(partialPath).size < MIN_MODEL_BYTES) {
    fs.rmSync(partialPath, { force: true });
    throw new Error('The downloaded model file is too small, so the download probably failed. Try again.');
  }
  fs.renameSync(partialPath, destination);
  send('phase', { modelId, phase: 'done', message: `The ${modelId} model is ready`, isSkipped: false });
}
