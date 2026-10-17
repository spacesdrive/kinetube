import type { VideoQuality } from '@shared/downloads.ts';

export const VIDEO_QUALITIES: readonly VideoQuality[] = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];

// mp4 video with m4a audio first, so merging needs no re-encode; then any codec; then one combined file
function selectorForHeight(height: number): string {
  return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best`;
}

const FORMAT_BY_QUALITY: Record<VideoQuality, string> = {
  best: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
  '2160p': selectorForHeight(2160),
  '1440p': selectorForHeight(1440),
  '1080p': selectorForHeight(1080),
  '720p': selectorForHeight(720),
  '480p': selectorForHeight(480),
  '360p': selectorForHeight(360),
};

const AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio';

// above 720p YouTube serves video and audio as separate streams, which only FFmpeg can merge
const QUALITIES_THAT_MERGE = new Set<VideoQuality>(['best', '2160p', '1440p', '1080p']);

export function formatSelector(quality: VideoQuality, isAudioOnly: boolean): string {
  if (isAudioOnly) return AUDIO_FORMAT;
  return FORMAT_BY_QUALITY[quality];
}

export function qualityNeedsMerge(quality: VideoQuality): boolean {
  return QUALITIES_THAT_MERGE.has(quality);
}
