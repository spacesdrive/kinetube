import path from 'node:path';

import type { WhisperModelId } from '@shared/transcriptions.ts';

interface ModelFile {
  label: string;
  fileName: string;
  sizeMb: number;
}

export const WHISPER_MODELS: Record<WhisperModelId, ModelFile> = {
  tiny: { label: 'Tiny (~75 MB)', fileName: 'ggml-tiny.bin', sizeMb: 75 },
  base: { label: 'Base (~142 MB)', fileName: 'ggml-base.bin', sizeMb: 142 },
  small: { label: 'Small (~466 MB)', fileName: 'ggml-small.bin', sizeMb: 466 },
  medium: { label: 'Medium (~1.5 GB)', fileName: 'ggml-medium.bin', sizeMb: 1500 },
  large: { label: 'Large (~2.9 GB)', fileName: 'ggml-large-v3.bin', sizeMb: 2900 },
};

export const WHISPER_MODEL_IDS = Object.keys(WHISPER_MODELS) as WhisperModelId[];

const HUGGING_FACE_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

// every real model is tens of megabytes; anything under 1 MB is an error page saved as a file
export const MIN_MODEL_BYTES = 1_000_000;

export function modelPath(modelsDir: string, modelId: WhisperModelId): string {
  return path.join(modelsDir, WHISPER_MODELS[modelId].fileName);
}

export function modelDownloadUrl(modelId: WhisperModelId): string {
  return `${HUGGING_FACE_BASE_URL}/${WHISPER_MODELS[modelId].fileName}`;
}
