import fs from 'node:fs';
import path from 'node:path';

import { extractFileFromTarXz, extractFromZip } from '../../lib/archives.ts';
import { markExecutable } from '../../lib/executable.ts';
import { downloadFileWithProgress } from '../../lib/httpDownload.ts';
import { runProcess } from '../../lib/runProcess.ts';
import { ffmpegBinaryName, ffmpegDownloadInfo } from './ffmpegBinary.ts';

import type { ToolEventSink } from '../toolEvents.ts';
import type { FfmpegDownloadInfo } from './ffmpegBinary.ts';

export interface FfmpegManager {
  binaryPath: string;
  // yt-dlp's --ffmpeg-location takes the folder, not the binary
  binaryDir: string;
  isInstalled(): boolean;
  install(send: ToolEventSink): Promise<void>;
  // whisper.cpp only reads 16 kHz mono 16-bit PCM WAV
  extractAudio(inputPath: string, outputPath: string, signal?: AbortSignal): Promise<void>;
}

export function createFfmpegManager(downloadsDir: string, platform: NodeJS.Platform = process.platform): FfmpegManager {
  const binaryName = ffmpegBinaryName(platform);
  const binaryPath = path.join(downloadsDir, binaryName);

  async function extractBinary(info: FfmpegDownloadInfo, archivePath: string): Promise<boolean> {
    const { matchEntry } = info;
    if (!matchEntry) return extractFileFromTarXz(archivePath, binaryName, binaryPath);

    const writtenCount = await extractFromZip(archivePath, (entryPath) => (matchEntry(entryPath) ? binaryPath : null));
    return writtenCount > 0;
  }

  async function downloadAndExtract(send: ToolEventSink): Promise<void> {
    const info = ffmpegDownloadInfo(platform);
    const archivePath = path.join(downloadsDir, `ffmpeg-setup.${info.archiveType}`);

    try {
      send('phase', { toolId: 'ffmpeg', phase: 'downloading', message: 'Downloading FFmpeg (about 90 MB)...', isSkipped: false });
      await downloadFileWithProgress(info.url, archivePath, (progress) => send('progress', { toolId: 'ffmpeg', ...progress }));

      send('phase', { toolId: 'ffmpeg', phase: 'extracting', message: `Extracting ${binaryName}...`, isSkipped: false });
      const isFound = await extractBinary(info, archivePath);
      if (!isFound) throw new Error(`${binaryName} wasn't inside the downloaded archive`);
      markExecutable(binaryPath, platform);
    } finally {
      fs.rmSync(archivePath, { force: true });
    }
  }

  return {
    binaryPath,
    binaryDir: downloadsDir,
    isInstalled: () => fs.existsSync(binaryPath),

    async install(send) {
      if (fs.existsSync(binaryPath)) {
        send('phase', { toolId: 'ffmpeg', phase: 'done', message: `${binaryName} is already installed`, isSkipped: true });
        return;
      }
      await downloadAndExtract(send);
      send('phase', { toolId: 'ffmpeg', phase: 'done', message: `${binaryName} installed`, isSkipped: false });
    },

    async extractAudio(inputPath, outputPath, signal) {
      const args = ['-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-y', outputPath];
      const { exitCode, stderr } = await runProcess(binaryPath, args, { signal });
      if (exitCode !== 0) throw new Error(`FFmpeg couldn't read the audio (exit code ${exitCode}): ${stderr.slice(-300)}`);
    },
  };
}
