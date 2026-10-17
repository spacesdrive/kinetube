import { pickChannelAvatar } from './channelAvatar.ts';
import { mapPlaylistEntries, mapVideoEntries } from './youtubeEntries.ts';
import { buildAudioFormats, buildVideoFormats } from './youtubeFormats.ts';

import type { YouTubeChannel, YouTubeMedia, YouTubePlaylist, YouTubeVideo } from '@shared/youtube.ts';
import type { ParsedYouTubeUrl } from './youtubeUrl.ts';
import type { YtdlpMediaJson } from '../ytdlpJson.ts';

type ParsedVideoUrl = Extract<ParsedYouTubeUrl, { videoId: string }>;
type ParsedChannelUrl = Extract<ParsedYouTubeUrl, { channelPath: string }>;
type ParsedPlaylistUrl = Extract<ParsedYouTubeUrl, { listId: string }>;

// the card shows a short preview; the full description is on YouTube
const DESCRIPTION_PREVIEW_LENGTH = 300;

export function mapYouTubeVideo(json: YtdlpMediaJson, parsed: ParsedVideoUrl): YouTubeVideo {
  const formats = json.formats ?? [];

  return {
    kind: 'video',
    urlType: parsed.urlType,
    id: json.id ?? parsed.videoId,
    url: parsed.cleanUrl,
    title: json.title ?? 'Untitled',
    description: (json.description ?? '').slice(0, DESCRIPTION_PREVIEW_LENGTH),
    thumbnailUrl: json.thumbnail ?? null,
    duration: json.duration ?? null,
    durationText: json.duration_string ?? null,
    viewCount: json.view_count ?? null,
    likeCount: json.like_count ?? null,
    uploader: json.uploader ?? null,
    uploadDate: json.upload_date ?? null,
    playlistUrl: parsed.playlistUrl,
    videoFormats: buildVideoFormats(formats),
    audioFormats: buildAudioFormats(formats),
  };
}

export function mapYouTubeChannel(json: YtdlpMediaJson, parsed: ParsedChannelUrl): YouTubeChannel {
  const isPlaylistsTab = parsed.tab === 'playlists';
  const entries = isPlaylistsTab ? [] : mapVideoEntries(json.entries);

  return {
    kind: 'channel',
    urlType: parsed.urlType,
    tab: parsed.tab,
    url: parsed.cleanUrl,
    channelPath: parsed.channelPath,
    channelId: json.channel_id || json.id || '',
    name: json.channel || json.uploader || json.title || 'Unknown channel',
    channelUrl: json.channel_url || parsed.cleanUrl,
    avatarUrl: pickChannelAvatar(json.thumbnails),
    videoCount: entries.length,
    entries,
    playlists: isPlaylistsTab ? mapPlaylistEntries(json.entries) : [],
  };
}

export function mapYouTubePlaylist(json: YtdlpMediaJson, parsed: ParsedPlaylistUrl): YouTubePlaylist {
  const entries = mapVideoEntries(json.entries);

  return {
    kind: 'playlist',
    urlType: parsed.urlType,
    id: json.id || parsed.listId,
    url: parsed.cleanUrl,
    title: json.title || 'Untitled playlist',
    owner: json.channel || json.uploader || null,
    ownerUrl: json.channel_url || json.uploader_url || null,
    thumbnailUrl: json.thumbnails?.at(-1)?.url || null,
    // YouTube's own count can include unavailable videos it hides from the listing
    videoCount: json.playlist_count ?? entries.length,
    entries,
  };
}

export function mapYouTubeMedia(json: YtdlpMediaJson, parsed: ParsedYouTubeUrl): YouTubeMedia {
  if ('channelPath' in parsed) return mapYouTubeChannel(json, parsed);
  if ('listId' in parsed) return mapYouTubePlaylist(json, parsed);
  return mapYouTubeVideo(json, parsed);
}
