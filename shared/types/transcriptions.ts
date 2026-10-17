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

// plain text, two subtitle formats, lyrics and three data formats, all with whisper's timestamps except txt
export type TranscriptFormat = 'txt' | 'srt' | 'vtt' | 'lrc' | 'csv' | 'tsv' | 'json';

export type TranscriptFiles = Record<TranscriptFormat, string>;

export interface CreateTranscriptionRequest {
  filePath: string;
  modelId?: WhisperModelId;
  language?: TranscriptionLanguage;
  // the files written beside filePath, named after it; only "txt" when left out
  formats?: TranscriptFormat[];
}

export interface TranscriptionEvents {
  phase: { phase: 'extracting' | 'transcribing'; message: string };
  progress: { percent: number };
  chunk: { text: string };
  // an uploaded file is a temporary copy, so nothing is written beside it and outputPaths is empty
  done: StreamDone<{ text: string; transcripts: TranscriptFiles; outputPaths: string[] }>;
}
