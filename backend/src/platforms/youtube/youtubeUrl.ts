import { bareHostname, readUrl } from '../urlBasics.ts';

import type { YouTubeChannel, YouTubeVideo } from '@shared/youtube.ts';

export type ParsedYouTubeUrl =
  | { urlType: YouTubeVideo['urlType']; videoId: string; cleanUrl: string }
  | { urlType: YouTubeChannel['urlType']; channelPath: string; cleanUrl: string };

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

// a handle, a channel id, a custom name or a user name, then an optional videos or shorts tab
const CHANNEL_PATTERN = /^\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)(?:\/(videos|shorts))?$/;

function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function parseChannelPath(pathname: string): ParsedYouTubeUrl | null {
  const match = pathname.match(CHANNEL_PATTERN);
  const channelPath = match?.[1];
  if (!channelPath) return null;

  const tab = match[2];
  if (tab === 'shorts') {
    return { urlType: 'channel-shorts', channelPath, cleanUrl: `https://www.youtube.com/${channelPath}/shorts` };
  }
  // a bare channel URL opens its videos tab
  const urlType = tab === 'videos' ? 'channel-videos' : 'channel';
  return { urlType, channelPath, cleanUrl: `https://www.youtube.com/${channelPath}/videos` };
}

// tracking parameters, playlists and timestamps are dropped, so the same video always gives the same cleanUrl
export function parseYouTubeUrl(rawUrl: unknown): ParsedYouTubeUrl | null {
  const url = readUrl(rawUrl);
  if (!url) return null;

  const hostname = bareHostname(url);
  const pathname = url.pathname.replace(/\/$/, '');

  if (hostname === 'youtu.be') {
    const videoId = pathname.slice(1).split('/')[0] ?? '';
    return VIDEO_ID_PATTERN.test(videoId) ? { urlType: 'video', videoId, cleanUrl: watchUrl(videoId) } : null;
  }
  if (hostname !== 'youtube.com') return null;

  const shortsId = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (shortsId) return { urlType: 'shorts', videoId: shortsId, cleanUrl: `https://www.youtube.com/shorts/${shortsId}` };

  const videoId = url.searchParams.get('v');
  if (pathname === '/watch' && videoId && VIDEO_ID_PATTERN.test(videoId)) {
    return { urlType: 'video', videoId, cleanUrl: watchUrl(videoId) };
  }

  return parseChannelPath(pathname);
}
