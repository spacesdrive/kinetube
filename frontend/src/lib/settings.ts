import { isVideoQuality } from './qualities';

import type { FileNameOptions, VideoQuality } from '@shared/downloads.ts';
import type { WhisperModelId } from '@shared/transcriptions.ts';

export interface DownloadPreferences {
  outputDir: string;
  defaultQuality: VideoQuality;
  useNumbering: boolean;
  prefix: string;
  suffix: string;
  useCustomFilename: boolean;
  customFilenameTemplate: string;
}

export interface TranscriptionPreferences {
  defaultModel: WhisperModelId;
  defaultLanguage: string;
}

export interface AppSettings {
  transcription: TranscriptionPreferences;
  downloads: DownloadPreferences;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transcription: { defaultModel: 'base', defaultLanguage: 'auto' },
  downloads: {
    outputDir: '',
    defaultQuality: 'best',
    useNumbering: false,
    prefix: '',
    suffix: '',
    useCustomFilename: false,
    customFilenameTemplate: '%(title)s',
  },
};

// the key 1.x used, so settings saved before the TypeScript rewrite still load
const STORAGE_KEY = 'kinetube_settings';

function readStored(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
  } catch {
    // a hand-edited or corrupt value falls back to the defaults instead of breaking the app
    return {};
  }
}

export function loadSettings(): AppSettings {
  const stored = readStored();
  const downloads = { ...DEFAULT_SETTINGS.downloads, ...stored.downloads };
  if (!isVideoQuality(downloads.defaultQuality)) downloads.defaultQuality = 'best';

  return {
    transcription: { ...DEFAULT_SETTINGS.transcription, ...stored.transcription },
    downloads,
  };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// the per-session copy of the download preferences, with the start number for numbering
export interface DownloadSettings extends DownloadPreferences {
  startNumber: number;
}

export function toDownloadSettings(preferences: DownloadPreferences): DownloadSettings {
  return { ...preferences, startNumber: 1 };
}

export function toFileNameOptions(settings: DownloadSettings): FileNameOptions {
  return {
    prefix: settings.prefix,
    suffix: settings.suffix,
    template: settings.useCustomFilename ? settings.customFilenameTemplate : '',
    sequenceNumber: settings.useNumbering ? settings.startNumber : null,
  };
}
