import { describe, expect, it } from 'vitest';

import { countBlocked, downloadTargets, filterEntries, isDownloadable } from '@/features/youtube/collectionFilters';

import type { VideoEntry } from '@shared/youtube.ts';

function entry(id: string, title: string, status: VideoEntry['status'] = 'available'): VideoEntry {
  return { id, title, url: `https://www.youtube.com/watch?v=${id}`, thumbnailUrl: '', duration: null, durationText: null, viewCount: null, uploadDate: null, status };
}

const ENTRIES = [entry('a', 'Cat video'), entry('b', 'Dog video'), entry('c', 'Launch stream', 'upcoming'), entry('d', '[Private video]', 'unavailable')];

describe('collection filters', () => {
  it('only lets available entries be downloaded', () => {
    expect(ENTRIES.map(isDownloadable)).toEqual([true, true, false, false]);
    expect(countBlocked(ENTRIES)).toBe(2);
  });

  it('filters by search text, then by the chosen chip', () => {
    const selected = new Set(['b']);
    expect(filterEntries(ENTRIES, 'video', 'all', selected).map((item) => item.id)).toEqual(['a', 'b', 'd']);
    expect(filterEntries(ENTRIES, '', 'selected', selected).map((item) => item.id)).toEqual(['b']);
    expect(filterEntries(ENTRIES, '', 'blocked', selected).map((item) => item.id)).toEqual(['c', 'd']);
  });

  it('downloads the ticked entries, or everything shown that can be downloaded when nothing is ticked', () => {
    expect(downloadTargets(ENTRIES, ENTRIES, new Set(['b', 'c'])).map((item) => item.id)).toEqual(['b']);
    expect(downloadTargets(ENTRIES, ENTRIES, new Set()).map((item) => item.id)).toEqual(['a', 'b']);
  });
});
