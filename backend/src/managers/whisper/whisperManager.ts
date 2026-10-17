import fs from 'node:fs';

import { findWhisperBinary } from './whisperBinary.ts';
import { buildWhisperFromSource } from './whisperBuild.ts';
import { installWhisperFromZip } from './whisperInstall.ts';
import { downloadWhisperModel } from './whisperModelDownload.ts';
import { modelPath, WHISPER_MODEL_IDS, WHISPER_MODELS } from './whisperModels.ts';
import { transcribeFile } from './whisperTranscribe.ts';

import type { TranscriptFormat, WhisperModel, WhisperModelId } from '@shared/transcriptions.ts';
import type { FfmpegManager } from '../ffmpeg/ffmpegManager.ts';
import type { ToolEventSink } from '../toolEvents.ts';
import type { ModelEventSink } from './whisperModelDownload.ts';
import type { TranscriptionEventSink, TranscriptResult } from './whisperTranscribe.ts';

export interface TranscribeInput {
  inputPath: string;
  modelId: WhisperModelId;
  language: string;
  formats: readonly TranscriptFormat[];
  send: TranscriptionEventSink;
  signal?: AbortSignal;
}

export interface WhisperManager {
  isInstalled(): boolean;
  install(send: ToolEventSink): Promise<void>;
  listModels(): WhisperModel[];
  isModelDownloaded(modelId: WhisperModelId): boolean;
  downloadModel(modelId: WhisperModelId, send: ModelEventSink): Promise<void>;
  transcribe(input: TranscribeInput): Promise<TranscriptResult>;
}

export interface WhisperDeps {
  downloadsDir: string;
  modelsDir: string;
  ffmpeg: FfmpegManager;
  platform?: NodeJS.Platform;
}

export function createWhisperManager({ downloadsDir, modelsDir, ffmpeg, platform = process.platform }: WhisperDeps): WhisperManager {
  const findBinary = (): string | null => findWhisperBinary(downloadsDir, platform);
  const isModelDownloaded = (modelId: WhisperModelId): boolean => fs.existsSync(modelPath(modelsDir, modelId));

  return {
    isInstalled: () => findBinary() !== null,
    isModelDownloaded,

    async install(send) {
      if (findBinary()) {
        send('phase', { toolId: 'whisper', phase: 'done', message: 'whisper.cpp is already installed', isSkipped: true });
        return;
      }
      if (platform === 'win32') await installWhisperFromZip(downloadsDir, send);
      else await buildWhisperFromSource(downloadsDir, send);

      if (!findBinary()) throw new Error("whisper-cli wasn't found after setup finished");
      send('phase', { toolId: 'whisper', phase: 'done', message: 'whisper.cpp installed', isSkipped: false });
    },

    listModels: () =>
      WHISPER_MODEL_IDS.map((modelId) => {
        const { label, sizeMb } = WHISPER_MODELS[modelId];
        return { id: modelId, label, sizeMb, isDownloaded: isModelDownloaded(modelId) };
      }),

    downloadModel: (modelId, send) => downloadWhisperModel(modelsDir, modelId, send),

    async transcribe({ inputPath, modelId, language, formats, send, signal }) {
      const binaryPath = findBinary();
      if (!binaryPath) throw new Error('whisper.cpp is not installed. Open the Transcribe page to install it.');
      return transcribeFile({ binaryPath, modelPath: modelPath(modelsDir, modelId), inputPath, language, formats, ffmpeg, send, signal });
    },
  };
}
