import { isRecord } from '../lib/lineSplitter.ts';

import type { Download, DownloadOptions, VideoQuality } from '@shared/downloads.ts';

// what is saved on disk; the status is worked out at read time from what is running
export type DownloadRecord = Omit<Download, 'status'>;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

// before 2.0 a record kept its options as flat fields named after the old query parameters
function fromLegacyFields(raw: Record<string, unknown>): DownloadRecord {
  const options: DownloadOptions = {
    quality: (asString(raw.quality) || 'best') as VideoQuality,
    isAudioOnly: raw.audioOnly === true,
    outputDir: asString(raw.outputDir) || null,
    fileName: {
      prefix: asString(raw.prefix),
      suffix: asString(raw.suffix),
      template: asString(raw.mainName),
      sequenceNumber: raw.useNumbering === true ? Number(raw.sequenceNum) || 1 : null,
    },
    account: null,
  };

  return {
    id: asString(raw.id),
    platform: 'youtube',
    url: asString(raw.url),
    title: asString(raw.title),
    options,
    startedAt: asString(raw.startedAt) || new Date().toISOString(),
    pausedAt: null,
  };
}

// trusted once it has an id and options: the file is written only by this app
export function readDownloadRecord(raw: unknown): DownloadRecord | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.url !== 'string') return null;
  if (!isRecord(raw.options)) return fromLegacyFields(raw);
  return raw as unknown as DownloadRecord;
}
