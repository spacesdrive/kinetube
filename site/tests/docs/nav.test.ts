import { describe, expect, it } from 'vitest';

import { docEntry, docNeighbours, firstPathOf, slugFromPath, DOC_TABS } from '@/docs/nav';
import { slugify } from '@/docs/searchShared';

describe('docs nav', () => {
  it('reads the slug from a docs address', () => {
    expect(slugFromPath('/docs')).toBe('');
    expect(slugFromPath('/docs/')).toBe('');
    expect(slugFromPath('/docs/guides/settings')).toBe('guides/settings');
  });

  it('finds the neighbours of a page and stops at the ends', () => {
    expect(docNeighbours('').previous).toBeNull();
    expect(docNeighbours('install').previous?.slug).toBe('');
    expect(docNeighbours('contribute/contributing').next).toBeNull();
  });

  it('opens each tab on its first page', () => {
    expect(DOC_TABS.map(firstPathOf)).toEqual(['/docs', '/docs/guides/youtube', '/docs/reference/privacy', '/docs/contribute/run-from-source']);
    expect(docEntry('guides/youtube')?.tab.id).toBe('guides');
  });

  it('turns a heading into an anchor', () => {
    expect(slugify('Pick a model')).toBe('pick-a-model');
    expect(slugify("FFmpeg on Apple Silicon (x64)")).toBe('ffmpeg-on-apple-silicon-x64');
  });
});
