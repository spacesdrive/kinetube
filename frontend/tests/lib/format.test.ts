import { describe, expect, it } from 'vitest';

import { countWords, formatBytes, formatCount, formatDuration, formatSpeed, formatUploadDate, pluralize } from '@/lib/format';

describe('format helpers', () => {
  it('shortens large counts and hides missing ones', () => {
    expect(formatCount(1_234_567)).toBe('1.2M');
    expect(formatCount(4_500)).toBe('4.5K');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(0)).toBeNull();
    expect(formatCount(null)).toBeNull();
  });

  it("reads yt-dlp's eight digit dates and passes anything else through", () => {
    expect(formatUploadDate('20240315')).toBe('2024-03-15');
    expect(formatUploadDate('2024')).toBe('2024');
    expect(formatUploadDate(null)).toBeNull();
  });

  it('writes durations as minutes and padded seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(19)).toBe('0:19');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(0)).toBeNull();
  });

  it('writes sizes and speeds in KB or MB, and nothing for zero', () => {
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
    expect(formatBytes(2_048)).toBe('2.0 KB');
    expect(formatBytes(0)).toBe('');
    expect(formatSpeed(3 * 1024 * 1024)).toBe('3.0 MB/s');
  });

  it('counts words and picks the singular for one', () => {
    expect(countWords('  two   words ')).toBe(2);
    expect(pluralize(1, 'video')).toBe('1 video');
    expect(pluralize(3, 'video')).toBe('3 videos');
  });
});
