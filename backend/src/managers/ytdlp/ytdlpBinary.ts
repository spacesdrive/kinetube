import { NotSupportedError } from '../../lib/errors.ts';

// the release this copy of KineTube was tested against; a newer installed release is fine
export const YTDLP_VERSION = '2026.03.17';
export const YTDLP_REPO = 'yt-dlp/yt-dlp';

// yt-dlp publishes one standalone binary per platform on each GitHub release
const ASSET_BY_PLATFORM: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'yt-dlp.exe',
  darwin: 'yt-dlp_macos',
  linux: 'yt-dlp_linux',
};

export function ytdlpAssetName(platform: NodeJS.Platform): string {
  const assetName = ASSET_BY_PLATFORM[platform];
  if (!assetName) throw new NotSupportedError(`yt-dlp has no managed binary for platform "${platform}"`);
  return assetName;
}

export function ytdlpBinaryName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

export function ytdlpDownloadUrl(platform: NodeJS.Platform, version: string = YTDLP_VERSION): string {
  return `https://github.com/${YTDLP_REPO}/releases/download/${version}/${ytdlpAssetName(platform)}`;
}

export function ytdlpReleaseUrl(version: string): string {
  return `https://github.com/${YTDLP_REPO}/releases/tag/${version}`;
}
