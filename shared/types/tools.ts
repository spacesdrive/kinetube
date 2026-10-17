import type { LogEvent, StreamDone, TransferProgress } from './api.ts';

export type ToolId = 'ytdlp' | 'ffmpeg' | 'whisper' | 'instaloader';

export interface Tool {
  id: ToolId;
  name: string;
  isInstalled: boolean;
  version: string | null;
  // the version this copy of KineTube was tested with; only yt-dlp has one
  requiredVersion: string | null;
  needsUpdate: boolean;
  // instaloader is a pip package, so it cannot be installed until Python itself is
  missingRequirement: 'python' | null;
}

export interface YtdlpRelease {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
}

export type ToolPhase =
  | 'downloading'
  | 'extracting'
  | 'cloning'
  | 'configuring'
  | 'building'
  | 'installing'
  | 'done'
  | 'error';

export interface ToolPhaseEvent {
  toolId: ToolId;
  phase: ToolPhase;
  message: string;
  isSkipped: boolean;
}

export interface ToolProgressEvent extends TransferProgress {
  toolId: ToolId;
}

export interface ToolInstallEvents {
  phase: ToolPhaseEvent;
  progress: ToolProgressEvent;
  log: LogEvent;
  done: StreamDone<{ tool: Tool }>;
}
