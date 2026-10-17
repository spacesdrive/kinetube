import crypto from 'node:crypto';

import type { DownloadOptions } from '@shared/downloads.ts';

// the same link with the same options always gets the same id, so starting it again reuses its record
export function makeDownloadId(url: string, options: DownloadOptions): string {
  const { quality, isAudioOnly, outputDir, fileName, account } = options;
  const key = JSON.stringify({ url, quality, isAudioOnly, outputDir, fileName, account });
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

export const DOWNLOAD_ID_PATTERN = /^[a-f0-9]{16}$/;
