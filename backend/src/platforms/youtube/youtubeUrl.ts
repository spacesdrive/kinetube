import { bareHostname, readUrl } from '../urlBasics.ts';

import type { ChannelTab, YouTubeChannel, YouTubePlaylist, YouTubeVideo } from '@shared/youtube.ts';

export type ParsedYouTubeUrl =
  | { urlType: YouTubeVideo['urlType']; videoId: string; cleanUrl: string; playlistUrl: string | null }
  | { urlType: YouTubeChannel['urlType']; channelPath: string; tab: ChannelTab; cleanUrl: string }
  | { urlType: YouTubePlaylist['urlType']; listId: string; cleanUrl: string };

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

// PL lists are 18 or 34 characters and album and mix lists run past 40; the two-letter WL and LL lists need a login
const LIST_ID_PATTERN = /^[a-zA-Z0-9_-]{10,64}$/;

// a handle, a channel id, a custom name or a user name, then an optional tab
const CHANNEL_PATTERN = /^\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)(?:\/(videos|shorts|streams|playlists))?$/;

const CHANNEL_TABS: readonly ChannelTab[] = ['videos', 'shorts', 'streams', 'playlists'];

const CHANNEL_URL_TYPES: Record<ChannelTab, YouTubeChannel['urlType']> = {
  videos: 'channel-videos',
  shorts: 'channel-shorts',
  streams: 'channel-streams',
  playlists: 'channel-playlists',
};

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function playlistUrl(listId: string): string {
  return `https://www.youtube.com/playlist?list=${listId}`;
}

export function isPlaylistId(value: unknown): value is string {
  return typeof value === 'string' && LIST_ID_PATTERN.test(value);
}

function parseChannelPath(pathname: string): ParsedYouTubeUrl | null {
  const match = pathname.match(CHANNEL_PATTERN);
  const channelPath = match?.[1];
  if (!channelPath) return null;

  const namedTab = CHANNEL_TABS.find((candidate) => candidate === match[2]);
  // a bare channel URL opens its videos tab
  if (!namedTab) return { urlType: 'channel', channelPath, tab: 'videos', cleanUrl: `https://www.youtube.com/${channelPath}/videos` };
  return { urlType: CHANNEL_URL_TYPES[namedTab], channelPath, tab: namedTab, cleanUrl: `https://www.youtube.com/${channelPath}/${namedTab}` };
}

function videoFromList(videoId: string, url: URL): ParsedYouTubeUrl {
  const listId = url.searchParams.get('list');
  return { urlType: 'video', videoId, cleanUrl: watchUrl(videoId), playlistUrl: isPlaylistId(listId) ? playlistUrl(listId) : null };
}

// tracking parameters and timestamps are dropped, so the same video always gives the same cleanUrl
export function parseYouTubeUrl(rawUrl: unknown): ParsedYouTubeUrl | null {
  const url = readUrl(rawUrl);
  if (!url) return null;

  const hostname = bareHostname(url);
  const pathname = url.pathname.replace(/\/$/, '');

  if (hostname === 'youtu.be') {
    const videoId = pathname.slice(1).split('/')[0] ?? '';
    return VIDEO_ID_PATTERN.test(videoId) ? videoFromList(videoId, url) : null;
  }
  if (hostname !== 'youtube.com') return null;

  const shortsId = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (shortsId) return { urlType: 'shorts', videoId: shortsId, cleanUrl: `https://www.youtube.com/shorts/${shortsId}`, playlistUrl: null };

  const videoId = url.searchParams.get('v');
  if (pathname === '/watch' && videoId && VIDEO_ID_PATTERN.test(videoId)) return videoFromList(videoId, url);

  const listId = url.searchParams.get('list');
  if (pathname === '/playlist') return isPlaylistId(listId) ? { urlType: 'playlist', listId, cleanUrl: playlistUrl(listId) } : null;

  return parseChannelPath(pathname);
}
