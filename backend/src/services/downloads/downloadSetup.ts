import fs from 'node:fs';
import path from 'node:path';

import { buildDownloadArgs } from '../../managers/ytdlp/ytdlpArgs.ts';
import { buildFileNameTemplate } from '../../managers/ytdlp/ytdlpFileNames.ts';
import { qualityNeedsMerge } from '../../managers/ytdlp/ytdlpFormats.ts';

import type { DownloadOptions, Platform } from '@shared/downloads.ts';
import type { FfmpegManager } from '../../managers/ffmpeg/ffmpegManager.ts';

export interface DownloadEnvironment {
  ffmpeg: FfmpegManager;
  defaultDir: string;
}

export interface DownloadPlan {
  url: string;
  platform: Platform;
  options: DownloadOptions;
  // seconds between yt-dlp's requests; a batch from Instagram needs it to stay under the rate limit
  sleepSeconds: number | null;
}

export interface PreparedDownload {
  args: string[];
  warnings: string[];
  willMerge: boolean;
}

function chooseOutputDir(requested: string | null, defaultDir: string, warnings: string[]): string {
  if (!requested) return defaultDir;
  if (fs.existsSync(requested)) return requested;

  warnings.push(`The folder "${requested}" wasn't found, so the file goes to the default downloads folder.`);
  return defaultDir;
}

function ffmpegWarning(options: DownloadOptions): string | null {
  if (options.isAudioOnly) return "FFmpeg isn't installed, so the MP3 conversion will fail. Install it from the setup screen.";
  if (qualityNeedsMerge(options.quality)) {
    return "FFmpeg isn't installed, so this download may be capped at 720p. Install it from the setup screen.";
  }
  return null;
}

export function prepareDownload(environment: DownloadEnvironment, plan: DownloadPlan): PreparedDownload {
  const { ffmpeg, defaultDir } = environment;
  const { url, options, sleepSeconds } = plan;
  const warnings: string[] = [];

  const outputDir = chooseOutputDir(options.outputDir, defaultDir, warnings);
  const isFfmpegReady = ffmpeg.isInstalled();
  const missingFfmpegWarning = isFfmpegReady ? null : ffmpegWarning(options);
  if (missingFfmpegWarning) warnings.push(missingFfmpegWarning);

  const args = buildDownloadArgs({
    url,
    outputTemplate: path.join(outputDir, buildFileNameTemplate(options.fileName)),
    quality: options.quality,
    isAudioOnly: options.isAudioOnly,
    ffmpegDir: isFfmpegReady ? ffmpeg.binaryDir : null,
    // instaloader sessions are not cookie files yt-dlp can read, so downloads run logged out (ROADMAP.md)
    cookiesPath: null,
    sleepSeconds,
  });

  return { args, warnings, willMerge: !options.isAudioOnly && isFfmpegReady };
}
