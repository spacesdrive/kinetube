import path from 'node:path';

import { NotSupportedError } from '../../lib/errors.ts';

export type FfmpegArchiveType = 'zip' | 'tar.xz';

export interface FfmpegDownloadInfo {
  archiveType: FfmpegArchiveType;
  url: string;
  // picks the binary out of a zip; a tar.xz is searched for the binary by name instead
  matchEntry: ((entryPath: string) => boolean) | null;
}

// the static builds the ffmpeg-static npm package uses (ADR-011); the macOS build is x64 and runs under Rosetta 2
const WINDOWS_ZIP_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
const MACOS_ZIP_URL = 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip';
const LINUX_TAR_XZ_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';

export function ffmpegBinaryName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

export function ffmpegDownloadInfo(platform: NodeJS.Platform): FfmpegDownloadInfo {
  if (platform === 'win32') {
    return {
      archiveType: 'zip',
      url: WINDOWS_ZIP_URL,
      matchEntry: (entryPath) => /ffmpeg\.exe$/i.test(entryPath) && /bin[/\\]/.test(entryPath),
    };
  }
  if (platform === 'darwin') {
    return { archiveType: 'zip', url: MACOS_ZIP_URL, matchEntry: (entryPath) => path.basename(entryPath) === 'ffmpeg' };
  }
  if (platform === 'linux') {
    return { archiveType: 'tar.xz', url: LINUX_TAR_XZ_URL, matchEntry: null };
  }
  throw new NotSupportedError(`FFmpeg has no managed static build for platform "${platform}"`);
}
