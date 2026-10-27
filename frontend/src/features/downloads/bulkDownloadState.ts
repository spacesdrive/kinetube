import type { DownloadBatchEvents, Platform } from '@shared/downloads.ts';
import type { StreamEvent } from '@/services/eventStream';

// an item that asks for a transcript is transcribing between its download and done
export type BulkItemStatus = 'pending' | 'running' | 'transcribing' | 'done';

export interface BulkItem {
  key: string;
  url: string;
  title: string;
  platform: Platform;
  // the backend transcribes it right after it downloads, in the formats chosen in Settings
  shouldTranscribe: boolean;
}

export interface BulkItemState extends BulkItem {
  status: BulkItemStatus;
  percent: number;
  isSuccess: boolean;
  message: string | null;
  filePath: string | null;
  transcriptPaths: string[];
  transcriptError: string | null;
}

export interface BulkDownloadState {
  kind: 'bulk';
  items: BulkItemState[];
  warning: string | null;
  isFinished: boolean;
  message: string | null;
}

export function createBulkDownload(items: BulkItem[]): BulkDownloadState {
  return {
    kind: 'bulk',
    items: items.map((item) => ({ ...item, status: 'pending', percent: 0, isSuccess: false, message: null, filePath: null, transcriptPaths: [], transcriptError: null })),
    warning: null,
    isFinished: false,
    message: null,
  };
}

function updateItem(state: BulkDownloadState, index: number, changes: Partial<BulkItemState>): BulkDownloadState {
  return { ...state, items: state.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)) };
}

export function applyBatchEvent(state: BulkDownloadState, ...[event, data]: StreamEvent<DownloadBatchEvents>): BulkDownloadState {
  if (event === 'itemStart') return updateItem(state, data.index, { status: 'running', percent: 0 });
  if (event === 'itemProgress') return updateItem(state, data.index, { percent: data.percent });
  // the percent starts again from 0 for the transcription
  if (event === 'itemTranscribing') return updateItem(state, data.index, { status: 'transcribing', percent: 0 });
  if (event === 'itemTranscribeProgress') return updateItem(state, data.index, { percent: data.percent });
  if (event === 'itemDone') {
    const { isSuccess, message, filePath, transcriptPaths, transcriptError } = data;
    const percent = isSuccess ? 100 : (state.items[data.index]?.percent ?? 0);
    return updateItem(state, data.index, { status: 'done', isSuccess, message, filePath, transcriptPaths, transcriptError, percent });
  }
  if (event === 'warning') return { ...state, warning: data.message };
  if (event === 'done') return { ...state, isFinished: true, message: data.message };
  return state;
}

export interface BulkSummary {
  total: number;
  doneCount: number;
  succeededCount: number;
  failedCount: number;
  transcribedCount: number;
  // whether any item asked for a transcript, so the dialog only counts transcripts when there are some
  hasTranscripts: boolean;
  current: BulkItemState | null;
}

export function summarizeBulk({ items }: BulkDownloadState): BulkSummary {
  const doneItems = items.filter((item) => item.status === 'done');
  const succeededCount = doneItems.filter((item) => item.isSuccess).length;
  return {
    total: items.length,
    doneCount: doneItems.length,
    succeededCount,
    failedCount: doneItems.length - succeededCount,
    transcribedCount: doneItems.filter((item) => item.transcriptPaths.length > 0).length,
    hasTranscripts: items.some((item) => item.shouldTranscribe),
    current: items.find((item) => item.status === 'running' || item.status === 'transcribing') ?? null,
  };
}
