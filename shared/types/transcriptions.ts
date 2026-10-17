import type { StreamDone, TransferProgress } from './api.ts';

export type WhisperModelId = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface WhisperModel {
  id: WhisperModelId;
  label: string;
  sizeMb: number;
  isDownloaded: boolean;
}

export interface ModelDownloadEvents {
  phase: { modelId: WhisperModelId; phase: 'downloading' | 'done' | 'error'; message: string; isSkipped: boolean };
  progress: TransferProgress & { modelId: WhisperModelId };
  done: StreamDone<{ model: WhisperModel }>;
}

// "auto" lets whisper detect the language; otherwise a two or three letter code such as "en"
export type TranscriptionLanguage = string;

export interface CreateTranscriptionRequest {
  filePath: string;
  modelId?: WhisperModelId;
  language?: TranscriptionLanguage;
}

export interface TranscriptionEvents {
  phase: { phase: 'extracting' | 'transcribing'; message: string };
  progress: { percent: number };
  chunk: { text: string };
  done: StreamDone<{ text: string; outputPath: string }>;
}
