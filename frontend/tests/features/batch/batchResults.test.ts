import { describe, expect, it } from 'vitest';

import { buildBatchItems, countSelected, initialSelection, parseBatchUrls } from '@/features/batch/batchResults';

import type { BatchResult, FoundMedia } from '@/features/batch/batchResults';
import type { YouTubeChannel, YouTubeVideo } from '@shared/youtube.ts';

const VIDEO = { kind: 'video', url: 'https://www.youtube.com/watch?v=a', title: 'A' } as YouTubeVideo;
const CHANNEL = {
  kind: 'channel',
  url: 'https://www.youtube.com/@c/videos',
  entries: [
    { id: 'x', title: 'X', url: 'https://youtu.be/x' },
    { id: 'y', title: 'Y', url: 'https://youtu.be/y' },
  ],
} as YouTubeChannel;

const videoFound: FoundMedia = { platform: 'youtube', media: VIDEO };
const channelFound: FoundMedia = { platform: 'youtube', media: CHANNEL };

describe('parseBatchUrls', () => {
  it('splits on lines and commas, keeps only links and drops repeats', () => {
    expect(parseBatchUrls('https://a.com\nnot a link, https://b.com\nhttps://a.com')).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('initialSelection', () => {
  it('selects a single video but nothing from a channel', () => {
    expect([...initialSelection(videoFound)]).toEqual([VIDEO.url]);
    expect(initialSelection(channelFound).size).toBe(0);
  });
});

describe('buildBatchItems', () => {
  it('turns a selected video and the ticked channel entries into download items', () => {
    const results: BatchResult[] = [
      { url: VIDEO.url, status: 'ready', found: videoFound, selectedIds: new Set([VIDEO.url]) },
      { url: CHANNEL.url, status: 'ready', found: channelFound, selectedIds: new Set(['y']) },
      { url: 'https://bad', status: 'error', message: 'nope' },
    ];
    expect(buildBatchItems(results, true).map((item) => item.url)).toEqual([VIDEO.url, 'https://youtu.be/y']);
    expect(buildBatchItems(results, true).every((item) => item.shouldTranscribe)).toBe(true);
    expect(countSelected(results)).toBe(2);
  });

  it('leaves out results with nothing selected', () => {
    const results: BatchResult[] = [{ url: CHANNEL.url, status: 'ready', found: channelFound, selectedIds: new Set() }];
    expect(buildBatchItems(results, false)).toEqual([]);
  });
});
