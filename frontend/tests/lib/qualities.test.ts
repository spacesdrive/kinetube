import { describe, expect, it } from 'vitest';

import { isQualityOffered, tallestHeight } from '@/lib/qualities';

describe('quality availability', () => {
  it('offers only the qualities a video actually has, and always offers the best one', () => {
    expect(isQualityOffered('best', 240)).toBe(true);
    expect(isQualityOffered('360p', 360)).toBe(true);
    expect(isQualityOffered('720p', 360)).toBe(false);
    expect(isQualityOffered('2160p', 1080)).toBe(false);
  });

  it('offers everything when the heights are unknown', () => {
    expect(tallestHeight([])).toBeNull();
    expect(isQualityOffered('2160p', null)).toBe(true);
  });

  it('finds the tallest stream', () => {
    expect(tallestHeight([144, 720, 360])).toBe(720);
  });
});
