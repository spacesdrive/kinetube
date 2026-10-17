import { ignore } from '../ignore';
import { CHANNEL_VIDEOS } from './channelVideos';
import { PLAYLIST } from './playlist';
import { VIDEO } from './video';

import type { BatchResult } from '@/features/batch/batchResults';
import type { BatchState } from '@/features/batch/useBatch';

const RESULTS: BatchResult[] = [
  { url: VIDEO.url, status: 'ready', found: { platform: 'youtube', media: VIDEO }, selectedIds: new Set([VIDEO.url]) },
  { url: PLAYLIST.url, status: 'ready', found: { platform: 'youtube', media: PLAYLIST }, selectedIds: new Set(PLAYLIST.entries.slice(0, 6).map((entry) => entry.id)) },
  { url: CHANNEL_VIDEOS.url, status: 'ready', found: { platform: 'youtube', media: CHANNEL_VIDEOS }, selectedIds: new Set(CHANNEL_VIDEOS.entries.slice(0, 3).map((entry) => entry.id)) },
];

// the batch page after three pasted links were read: a video, a playlist and a channel's Videos tab
export const BATCH: BatchState = {
  text: RESULTS.map((result) => result.url).join('\n'),
  setText: ignore,
  results: RESULTS,
  isProcessing: false,
  process: async () => {},
  setSelection: ignore,
  reset: ignore,
};
