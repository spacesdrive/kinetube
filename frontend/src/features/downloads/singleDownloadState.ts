import type { DownloadEvents, DownloadPhase, VideoQuality } from '@shared/downloads.ts';
import type { StreamEvent } from '@/services/eventStream';

export type SingleStatus = 'running' | 'paused' | 'done';

export interface SingleDownloadState {
  kind: 'single';
  downloadId: string | null;
  title: string;
  quality: VideoQuality;
  isAudioOnly: boolean;
  percent: number;
  speed: string;
  eta: string;
  phase: DownloadPhase;
  phaseLabel: string;
  isMultiFile: boolean;
  status: SingleStatus;
  isSuccess: boolean;
  message: string;
  warning: string | null;
  filePath: string | null;
}

const MERGING_PERCENT = 97;

// a split download fills the bar in two halves so it never moves backwards: video 0-50, audio 50-95, merge 97
export function scaledPercent(percent: number, phase: DownloadPhase, isMultiFile: boolean): number {
  if (!isMultiFile) return percent;
  if (phase === 'video') return percent * 0.5;
  if (phase === 'audio') return 50 + percent * 0.45;
  return MERGING_PERCENT;
}

export function createSingleDownload(title: string, quality: VideoQuality, isAudioOnly: boolean): SingleDownloadState {
  return {
    kind: 'single',
    downloadId: null,
    title,
    quality,
    isAudioOnly,
    percent: 0,
    speed: '',
    eta: '',
    phase: isAudioOnly ? 'audio' : 'video',
    phaseLabel: isAudioOnly ? 'Downloading audio...' : 'Downloading video...',
    isMultiFile: false,
    status: 'running',
    isSuccess: false,
    message: '',
    warning: null,
    filePath: null,
  };
}

export function applyDownloadEvent(state: SingleDownloadState, ...[event, data]: StreamEvent<DownloadEvents>): SingleDownloadState {
  if (event === 'start') {
    // willMerge arrives before any progress, so the bar is scaled for two files from the first line
    return { ...state, downloadId: data.download.id, isMultiFile: state.isMultiFile || data.willMerge, status: 'running' };
  }
  if (event === 'title') return { ...state, title: data.title };
  if (event === 'warning') return { ...state, warning: data.message };
  if (event === 'phase') {
    const isMultiFile = state.isMultiFile || data.isMultiFile;
    const percent = data.phase === 'merging' ? MERGING_PERCENT : scaledPercent(0, data.phase, isMultiFile);
    return { ...state, phase: data.phase, phaseLabel: data.label, isMultiFile, percent: Math.max(state.percent, percent) };
  }
  if (event === 'progress') {
    const isMultiFile = state.isMultiFile || data.isMultiFile;
    return { ...state, percent: scaledPercent(data.percent, data.phase, isMultiFile), speed: data.speed, eta: data.eta, phase: data.phase, isMultiFile };
  }
  if (event === 'paused') return { ...state, status: 'paused', phaseLabel: 'Paused', message: 'Download paused' };
  if (event === 'done') return finishSingle(state, data);
  return state;
}

function finishSingle(state: SingleDownloadState, done: DownloadEvents['done']): SingleDownloadState {
  if (!done.success) return { ...state, status: 'done', isSuccess: false, message: done.message, phaseLabel: 'Failed' };
  return {
    ...state,
    status: 'done',
    isSuccess: true,
    message: done.message,
    title: done.title || state.title,
    filePath: done.filePath || null,
    percent: 100,
    phaseLabel: 'Complete',
  };
}
