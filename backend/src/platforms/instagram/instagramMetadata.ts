import { fileSizeOf } from '../ytdlpJson.ts';

import type { InstagramFormat, InstagramPost } from '@shared/instagram.ts';
import type { YtdlpFormatJson, YtdlpMediaJson } from '../ytdlpJson.ts';
import type { InstagramPostUrlType } from './instagramUrl.ts';

export interface ParsedPostUrl {
  urlType: InstagramPostUrlType;
  cleanUrl: string;
  shortcode: string | null;
}

// the card shows a short preview of the caption
const DESCRIPTION_PREVIEW_LENGTH = 300;

// Instagram serves one combined stream per height, so each height is one option
function buildInstagramFormats(formats: YtdlpFormatJson[]): InstagramFormat[] {
  const seenHeights = new Set<number>();
  const result: InstagramFormat[] = [];

  for (const format of formats) {
    const height = format.height ?? 0;
    const hasVideo = Boolean(format.vcodec && format.vcodec !== 'none');
    if (!hasVideo || height <= 0 || seenHeights.has(height)) continue;

    seenHeights.add(height);
    result.push({ height, label: `${height}p`, ext: format.ext ?? '', fileSize: fileSizeOf(format) });
  }
  return result.sort((first, second) => second.height - first.height);
}

export function mapInstagramPost(json: YtdlpMediaJson, parsed: ParsedPostUrl): InstagramPost {
  const caption = json.description || json.title || '';

  return {
    kind: 'post',
    urlType: parsed.urlType,
    id: json.id ?? parsed.shortcode ?? '',
    url: parsed.cleanUrl,
    shortcode: parsed.shortcode,
    title: json.title || json.description || 'Untitled',
    description: caption.slice(0, DESCRIPTION_PREVIEW_LENGTH),
    thumbnailUrl: json.thumbnail || json.thumbnails?.at(-1)?.url || null,
    width: json.width || null,
    height: json.height || null,
    duration: json.duration ?? null,
    durationText: json.duration_string ?? null,
    viewCount: json.view_count ?? null,
    likeCount: json.like_count ?? null,
    commentCount: json.comment_count ?? null,
    uploader: json.uploader || json.channel || null,
    uploadDate: json.upload_date ?? null,
    formats: buildInstagramFormats(json.formats ?? []),
  };
}
