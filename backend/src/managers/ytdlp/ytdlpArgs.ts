import { formatSelector } from './ytdlpFormats.ts';

import type { VideoQuality } from '@shared/downloads.ts';

export interface DownloadArgsInput {
  url: string;
  outputTemplate: string;
  quality: VideoQuality;
  isAudioOnly: boolean;
  ffmpegDir: string | null;
  cookiesPath: string | null;
  // seconds between yt-dlp's own requests; Instagram rate-limits bursts
  sleepSeconds: number | null;
}

export interface MetadataArgsInput {
  url: string;
  isPlaylist: boolean;
  ffmpegDir: string | null;
  cookiesPath: string | null;
}

function appendTarget(args: string[], url: string): string[] {
  // "--" ends the options, so a value starting with "-" can never be read as a yt-dlp flag such as --exec
  return [...args, '--', url];
}

export function buildDownloadArgs(input: DownloadArgsInput): string[] {
  const { url, outputTemplate, quality, isAudioOnly, ffmpegDir, cookiesPath, sleepSeconds } = input;
  const args = ['--newline', '--progress', '--no-warnings', '--no-check-certificates', '--restrict-filenames'];

  args.push('-f', formatSelector(quality, isAudioOnly), '-o', outputTemplate);
  if (sleepSeconds) args.push('--sleep-requests', String(sleepSeconds));
  if (cookiesPath) args.push('--cookies', cookiesPath);
  if (ffmpegDir) args.push('--ffmpeg-location', ffmpegDir);

  if (isAudioOnly) {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    args.push('--merge-output-format', 'mp4');
  }
  return appendTarget(args, url);
}

export function buildMetadataArgs(input: MetadataArgsInput): string[] {
  const { url, isPlaylist, ffmpegDir, cookiesPath } = input;
  const args = ['--no-warnings', '--no-check-certificates'];

  // a flat playlist lists a channel's videos without opening each one
  if (isPlaylist) args.push('--flat-playlist', '--dump-single-json');
  else args.push('-J');

  if (cookiesPath) args.push('--cookies', cookiesPath);
  if (ffmpegDir) args.push('--ffmpeg-location', ffmpegDir);
  return appendTarget(args, url);
}
