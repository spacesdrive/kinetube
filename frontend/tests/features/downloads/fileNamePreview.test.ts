import { describe, expect, it } from 'vitest';

import { hasCustomNaming, previewFileName } from '@/features/downloads/fileNamePreview';
import { DEFAULT_SETTINGS, toDownloadSettings } from '@/lib/settings';

const BASE = toDownloadSettings(DEFAULT_SETTINGS.downloads);

describe('previewFileName', () => {
  it('shows the title alone by default', () => {
    expect(previewFileName(BASE)).toBe('Video Title.mp4');
  });

  it('adds the number, prefix and suffix in the same order as the backend', () => {
    expect(previewFileName({ ...BASE, useNumbering: true, startNumber: 3, prefix: 'Clip', suffix: 'HD' })).toBe('03 - Clip Video Title HD.mp4');
  });

  it('fills known template fields with examples and names the unknown ones', () => {
    const settings = { ...BASE, useCustomFilename: true, customFilenameTemplate: '%(uploader)s - %(album)s' };
    expect(previewFileName(settings)).toBe('Channel Name - (album).mp4');
  });
});

describe('hasCustomNaming', () => {
  it('is false for the defaults and true once anything is changed', () => {
    expect(hasCustomNaming(BASE)).toBe(false);
    expect(hasCustomNaming({ ...BASE, outputDir: 'D:\\Videos' })).toBe(true);
  });
});
