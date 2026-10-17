import type { Platform } from '@shared/downloads.ts';
import type { InstagramMedia } from '@shared/instagram.ts';
import type { YouTubeMedia } from '@shared/youtube.ts';
import type { BulkItem } from '../downloads/bulkDownloadState';

export type FoundMedia = { platform: 'youtube'; media: YouTubeMedia } | { platform: 'instagram'; media: InstagramMedia };

export type BatchResult =
  | { url: string; status: 'pending' | 'loading' }
  | { url: string; status: 'error'; message: string }
  | { url: string; status: 'ready'; found: FoundMedia; selectedIds: ReadonlySet<string> };

export interface CollectionEntry {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  // an upcoming stream or a private video is listed but can't be picked
  isDownloadable: boolean;
}

// one link per line or separated by commas; repeats are dropped and the first order kept
export function parseBatchUrls(text: string): string[] {
  const urls = text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
  return [...new Set(urls)];
}

// a channel, a playlist or a profile holds many items the person picks from; anything else is one item
export function isCollection(found: FoundMedia): boolean {
  const { kind } = found.media;
  return kind === 'channel' || kind === 'playlist' || kind === 'profile';
}

export function collectionEntries({ media }: FoundMedia): CollectionEntry[] {
  if (media.kind === 'channel' || media.kind === 'playlist') {
    return media.entries.map(({ id, title, url, thumbnailUrl, duration, status }) => ({ id, title, url, thumbnailUrl, duration, isDownloadable: status === 'available' }));
  }
  if (media.kind === 'profile') {
    return media.entries.map(({ id, title, url, thumbnailUrl, duration }) => ({ id, title, url, thumbnailUrl, duration, isDownloadable: true }));
  }
  return [];
}

// a single item starts selected; a collection starts empty so nothing large downloads by accident
export function initialSelection(found: FoundMedia): ReadonlySet<string> {
  return isCollection(found) ? new Set() : new Set([found.media.url]);
}

function singleItem(found: FoundMedia): { url: string; title: string } {
  const { media } = found;
  if (media.kind === 'video' || media.kind === 'post') return { url: media.url, title: media.title };
  return { url: media.url, title: media.url };
}

export function buildBatchItems(results: BatchResult[], shouldTranscribe: boolean): BulkItem[] {
  const items: BulkItem[] = [];
  for (const result of results) {
    if (result.status !== 'ready' || result.selectedIds.size === 0) continue;
    const platform: Platform = result.found.platform;

    if (!isCollection(result.found)) {
      const { url, title } = singleItem(result.found);
      items.push({ key: url, url, title, platform, shouldTranscribe });
      continue;
    }
    for (const entry of collectionEntries(result.found)) {
      if (entry.isDownloadable && result.selectedIds.has(entry.id)) items.push({ key: entry.url, url: entry.url, title: entry.title, platform, shouldTranscribe });
    }
  }
  return items;
}

export function countSelected(results: BatchResult[]): number {
  return results.reduce((total, result) => (result.status === 'ready' ? total + result.selectedIds.size : total), 0);
}
