import { pickChannelAvatar } from './channelAvatar.ts';
import { buildAudioFormats, buildVideoFormats } from './youtubeFormats.ts';

import type { ChannelEntry, YouTubeChannel, YouTubeVideo } from '@shared/youtube.ts';
import type { ParsedYouTubeUrl } from './youtubeUrl.ts';
import type { YtdlpEntryJson, YtdlpMediaJson } from '../ytdlpJson.ts';

type ParsedVideoUrl = Extract<ParsedYouTubeUrl, { videoId: string }>;
type ParsedChannelUrl = Extract<ParsedYouTubeUrl, { channelPath: string }>;

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
    videoFormats: buildVideoFormats(formats),
    audioFormats: buildAudioFormats(formats),
  };
}

function mapChannelEntry(entry: YtdlpEntryJson & { id: string }): ChannelEntry {
  const lastThumbnail = entry.thumbnails?.at(-1)?.url;

  return {
    id: entry.id,
    title: entry.title || 'Untitled',
    url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
    thumbnailUrl: lastThumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
    duration: entry.duration || null,
    durationText: entry.duration_string || null,
    viewCount: entry.view_count || null,
    uploadDate: entry.upload_date || null,
  };
}

export function mapYouTubeChannel(json: YtdlpMediaJson, parsed: ParsedChannelUrl): YouTubeChannel {
  const entries: ChannelEntry[] = [];
  for (const entry of json.entries ?? []) {
    if (entry?.id) entries.push(mapChannelEntry({ ...entry, id: entry.id }));
  }

  return {
    kind: 'channel',
    urlType: parsed.urlType,
    url: parsed.cleanUrl,
    channelPath: parsed.channelPath,
    channelId: json.channel_id || json.id || '',
    name: json.channel || json.uploader || json.title || 'Unknown channel',
    channelUrl: json.channel_url || parsed.cleanUrl,
    avatarUrl: pickChannelAvatar(json.thumbnails),
    videoCount: entries.length,
    entries,
  };
}
