import type { VideoQuality } from '@shared/downloads.ts';

export const VIDEO_QUALITIES: readonly VideoQuality[] = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];

export const QUALITY_LABELS: Record<VideoQuality, string> = {
  best: 'Best available',
  '2160p': '4K (2160p)',
  '1440p': '2K (1440p)',
  '1080p': '1080p Full HD',
  '720p': '720p HD',
  '480p': '480p SD',
  '360p': '360p',
};

// Instagram rarely serves more than 1080p, so its pickers offer the short list
export const SHORT_QUALITY_LIST: readonly VideoQuality[] = ['best', '1080p', '720p', '480p'];

// above 720p YouTube sends video and audio separately, which only FFmpeg can merge
export function qualityNeedsFfmpeg(quality: VideoQuality): boolean {
  return quality === 'best' || quality === '2160p' || quality === '1440p' || quality === '1080p';
}

const QUALITY_HEIGHTS: Record<Exclude<VideoQuality, 'best'>, number> = {
  '2160p': 2160,
  '1440p': 1440,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360,
};

// a quality above the tallest stream the video has would only download the same file under a bigger label
export function isQualityOffered(quality: VideoQuality, maxHeight: number | null): boolean {
  if (quality === 'best' || maxHeight === null) return true;
  return QUALITY_HEIGHTS[quality] <= maxHeight;
}

export function tallestHeight(heights: readonly number[]): number | null {
  return heights.length > 0 ? Math.max(...heights) : null;
}

export function isVideoQuality(value: string): value is VideoQuality {
  return VIDEO_QUALITIES.some((quality) => quality === value);
}
