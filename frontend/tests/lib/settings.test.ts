import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, toDownloadSettings, toFileNameOptions } from '@/lib/settings';

afterEach(() => localStorage.clear());

describe('loadSettings', () => {
  it('gives the defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('fills in fields missing from settings saved by an older version', () => {
    localStorage.setItem('kinetube_settings', JSON.stringify({ downloads: { prefix: 'old' } }));
    const settings = loadSettings();
    expect(settings.downloads.prefix).toBe('old');
    expect(settings.downloads.defaultQuality).toBe('best');
    expect(settings.transcription.defaultModel).toBe('base');
  });

  it('falls back to the defaults when the saved value is not JSON', () => {
    localStorage.setItem('kinetube_settings', '{broken');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('replaces a saved quality the app no longer offers', () => {
    localStorage.setItem('kinetube_settings', JSON.stringify({ downloads: { defaultQuality: '8k' } }));
    expect(loadSettings().downloads.defaultQuality).toBe('best');
  });

  it('reads back what was saved', () => {
    const settings = { ...DEFAULT_SETTINGS, downloads: { ...DEFAULT_SETTINGS.downloads, suffix: '_HD' } };
    saveSettings(settings);
    expect(loadSettings().downloads.suffix).toBe('_HD');
  });
});

describe('toFileNameOptions', () => {
  it('sends the template only when the custom name is on, and the number only when numbering is on', () => {
    const settings = { ...toDownloadSettings(DEFAULT_SETTINGS.downloads), startNumber: 5 };
    expect(toFileNameOptions(settings)).toEqual({ prefix: '', suffix: '', template: '', sequenceNumber: null });

    const custom = { ...settings, useCustomFilename: true, customFilenameTemplate: '%(id)s', useNumbering: true };
    expect(toFileNameOptions(custom)).toEqual({ prefix: '', suffix: '', template: '%(id)s', sequenceNumber: 5 });
  });
});
