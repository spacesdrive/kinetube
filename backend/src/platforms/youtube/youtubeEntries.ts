import { isPlaylistId, parseYouTubeUrl, playlistUrl, watchUrl } from './youtubeUrl.ts';

import type { PlaylistEntry, VideoEntry, VideoEntryStatus } from '@shared/youtube.ts';
import type { YtdlpEntryJson } from '../ytdlpJson.ts';

// a flat listing never opens the video, so a private or deleted one only shows up through these
const UNAVAILABLE_AVAILABILITY = ['private', 'needs_auth', 'premium_only', 'subscriber_only'];
const UNAVAILABLE_TITLE_PATTERN = /^\[(Private|Deleted|Unavailable) video\]$/i;

export function entryStatus(entry: YtdlpEntryJson): VideoEntryStatus {
  if (entry.live_status === 'is_upcoming') return 'upcoming';
  if (entry.live_status === 'is_live') return 'live';
  if (entry.availability && UNAVAILABLE_AVAILABILITY.includes(entry.availability)) return 'unavailable';
  if (entry.title && UNAVAILABLE_TITLE_PATTERN.test(entry.title)) return 'unavailable';
  return 'available';
}

// the download routes accept only clean watch and Shorts links, so an entry never carries anything else
function entryUrl(entry: YtdlpEntryJson, videoId: string): string {
  const parsed = parseYouTubeUrl(entry.url);
  if (parsed && 'videoId' in parsed && parsed.videoId === videoId) return parsed.cleanUrl;
  return watchUrl(videoId);
}

function mapVideoEntry(entry: YtdlpEntryJson, videoId: string): VideoEntry {
  const lastThumbnail = entry.thumbnails?.at(-1)?.url;

  return {
    id: videoId,
    title: entry.title || 'Untitled',
    url: entryUrl(entry, videoId),
    thumbnailUrl: lastThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: entry.duration || null,
    durationText: entry.duration_string || null,
    viewCount: entry.view_count || null,
    uploadDate: entry.upload_date || null,
    status: entryStatus(entry),
  };
}

export function mapVideoEntries(entries: (YtdlpEntryJson | null)[] | undefined): VideoEntry[] {
  const videoEntries: VideoEntry[] = [];
  for (const entry of entries ?? []) {
    if (entry?.id && entry.ie_key !== 'YoutubeTab') videoEntries.push(mapVideoEntry(entry, entry.id));
  }
  return videoEntries;
}

// a channel's playlists tab lists playlists, not videos; each one opens as its own playlist page
export function mapPlaylistEntries(entries: (YtdlpEntryJson | null)[] | undefined): PlaylistEntry[] {
  const playlistEntries: PlaylistEntry[] = [];
  for (const entry of entries ?? []) {
    if (entry?.ie_key !== 'YoutubeTab' || !isPlaylistId(entry.id)) continue;
    playlistEntries.push({
      id: entry.id,
      title: entry.title || 'Untitled playlist',
      url: playlistUrl(entry.id),
      thumbnailUrl: entry.thumbnails?.at(-1)?.url || null,
    });
  }
  return playlistEntries;
}
