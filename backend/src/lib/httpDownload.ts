import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

import type { IncomingMessage } from 'node:http';
import type { TransferProgress } from '@shared/api.ts';

export type ProgressListener = (progress: TransferProgress) => void;

// GitHub release assets redirect through several hosts before the file itself
const DEFAULT_MAX_REDIRECTS = 12;

function requestUrl(url: string): Promise<IncomingMessage> {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    client.get(url, resolve).on('error', reject);
  });
}

function isRedirect(response: IncomingMessage): boolean {
  const status = response.statusCode ?? 0;
  return status >= 300 && status < 400 && Boolean(response.headers.location);
}

async function followRedirects(url: string, maxRedirects: number): Promise<IncomingMessage> {
  let currentUrl = url;

  for (let redirectCount = 0; ; redirectCount++) {
    const response = await requestUrl(currentUrl);
    if (!isRedirect(response)) {
      if (response.statusCode === 200) return response;
      response.resume();
      throw new Error(`HTTP ${response.statusCode} for ${currentUrl}`);
    }

    response.resume();
    if (redirectCount >= maxRedirects) throw new Error('Too many redirects');
    currentUrl = new URL(response.headers.location ?? '', currentUrl).toString();
  }
}

function writeWithProgress(response: IncomingMessage, destination: string, onProgress?: ProgressListener): Promise<void> {
  const totalBytes = Number(response.headers['content-length']) || 0;
  const startedAt = Date.now();
  let downloadedBytes = 0;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    response.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      const elapsedSeconds = (Date.now() - startedAt) / 1000 || 0.001;
      onProgress?.({
        downloadedBytes,
        totalBytes,
        percent: totalBytes ? (downloadedBytes / totalBytes) * 100 : 0,
        bytesPerSecond: downloadedBytes / elapsedSeconds,
      });
    });
    response.on('aborted', () => file.destroy(new Error('The connection closed before the download finished')));
    response.on('error', (error) => file.destroy(error));
    file.on('error', reject);
    file.on('finish', () => file.close(() => resolve()));
    response.pipe(file);
  });
}

// downloads a file to disk, following redirects; a failed download never leaves a partial file behind
export async function downloadFileWithProgress(
  url: string,
  destination: string,
  onProgress?: ProgressListener,
  maxRedirects: number = DEFAULT_MAX_REDIRECTS,
): Promise<void> {
  try {
    const response = await followRedirects(url, maxRedirects);
    await writeWithProgress(response, destination, onProgress);
  } catch (error) {
    fs.rmSync(destination, { force: true });
    throw error;
  }
}
