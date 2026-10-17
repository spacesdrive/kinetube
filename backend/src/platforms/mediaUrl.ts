import { parseInstagramUrl } from './instagram/instagramUrl.ts';
import { parseYouTubeUrl } from './youtube/youtubeUrl.ts';

import type { Platform } from '@shared/downloads.ts';

export interface DownloadTarget {
  platform: Platform;
  cleanUrl: string;
}

// only single items can be downloaded; a channel or profile URL would make yt-dlp fetch everything on it
export function parseDownloadTarget(rawUrl: unknown): DownloadTarget | null {
  const youtube = parseYouTubeUrl(rawUrl);
  if (youtube) {
    const isSingleVideo = youtube.urlType === 'video' || youtube.urlType === 'shorts';
    return isSingleVideo ? { platform: 'youtube', cleanUrl: youtube.cleanUrl } : null;
  }

  const instagram = parseInstagramUrl(rawUrl);
  if (!instagram) return null;
  const isSinglePost = instagram.urlType === 'post' || instagram.urlType === 'reel' || instagram.urlType === 'story';
  return isSinglePost ? { platform: 'instagram', cleanUrl: instagram.cleanUrl } : null;
}
