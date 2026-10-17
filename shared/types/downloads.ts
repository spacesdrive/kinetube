import type { LogEvent, StreamDone, WarningEvent } from './api.ts';

export type Platform = 'youtube' | 'instagram';

export type VideoQuality = 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';

export type DownloadStatus = 'active' | 'paused' | 'interrupted';

export interface FileNameOptions {
  prefix: string;
  suffix: string;
  // a yt-dlp output template such as "%(uploader)s - %(title)s"; empty means the video title plus its id
  template: string;
  // null turns numbering off
  sequenceNumber: number | null;
}

export interface DownloadOptions {
  quality: VideoQuality;
  isAudioOnly: boolean;
  outputDir: string | null;
  fileName: FileNameOptions;
  account: string | null;
}

export interface Download {
  id: string;
  platform: Platform;
  url: string;
  title: string;
  status: DownloadStatus;
  options: DownloadOptions;
  startedAt: string;
  pausedAt: string | null;
}

export interface CreateDownloadRequest {
  url: string;
  quality?: VideoQuality;
  isAudioOnly?: boolean;
  outputDir?: string | null;
  fileName?: Partial<FileNameOptions>;
  account?: string | null;
}

export type DownloadPhase = 'video' | 'audio' | 'merging';

export interface DownloadProgressEvent {
  percent: number;
  speed: string;
  eta: string;
  title: string;
  phase: DownloadPhase;
  isMultiFile: boolean;
}

export interface DownloadPhaseEvent {
  phase: DownloadPhase;
  label: string;
  isMultiFile: boolean;
}

export interface DownloadEvents {
  start: { download: Download; willMerge: boolean };
  title: { title: string };
  progress: DownloadProgressEvent;
  phase: DownloadPhaseEvent;
  log: LogEvent;
  warning: WarningEvent;
  paused: { download: Download };
  done: StreamDone<{ title: string; filePath: string }>;
}

export interface BatchItem {
  url: string;
  title?: string;
}

export interface CreateDownloadBatchRequest {
  items: BatchItem[];
  quality?: VideoQuality;
  isAudioOnly?: boolean;
  outputDir?: string | null;
  fileName?: Partial<FileNameOptions>;
  account?: string | null;
}

export interface DownloadBatchEvents {
  start: { total: number };
  itemStart: { index: number; url: string; title: string };
  itemProgress: { index: number; percent: number };
  itemDone: { index: number; isSuccess: boolean; filePath: string | null; message: string | null };
  warning: WarningEvent;
  done: StreamDone<{ succeededCount: number; failedCount: number }>;
}
