import type { DownloadBatchEvents, Platform } from '@shared/downloads.ts';
import type { StreamEvent } from '@/services/eventStream';

export type BulkItemStatus = 'pending' | 'running' | 'done';

export interface BulkItem {
  key: string;
  url: string;
  title: string;
  platform: Platform;
  // transcribed quietly once its file is saved
  shouldTranscribe: boolean;
}

export interface BulkItemState extends BulkItem {
  status: BulkItemStatus;
  percent: number;
  isSuccess: boolean;
  message: string | null;
  filePath: string | null;
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
    items: items.map((item) => ({ ...item, status: 'pending', percent: 0, isSuccess: false, message: null, filePath: null })),
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
  if (event === 'itemDone') {
    const percent = data.isSuccess ? 100 : (state.items[data.index]?.percent ?? 0);
    return updateItem(state, data.index, { status: 'done', isSuccess: data.isSuccess, message: data.message, filePath: data.filePath, percent });
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
    current: items.find((item) => item.status === 'running') ?? null,
  };
}
