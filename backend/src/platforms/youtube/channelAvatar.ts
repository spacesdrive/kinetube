import type { YtdlpThumbnailJson } from '../ytdlpJson.ts';

// pixel area when the size is known, otherwise the size from a "=s900" image URL parameter
function resolutionOf(thumbnail: YtdlpThumbnailJson): number {
  if (thumbnail.width && thumbnail.height) return thumbnail.width * thumbnail.height;
  const sizeText = (thumbnail.url ?? '').match(/[=?&]s(\d+)/)?.[1];
  return sizeText ? Number(sizeText) ** 2 : 0;
}

// banners are very wide (2560x340) or cropped googleusercontent images
function isBanner(thumbnail: YtdlpThumbnailJson): boolean {
  const url = thumbnail.url ?? '';
  if (thumbnail.width && thumbnail.height && thumbnail.height / thumbnail.width < 0.5) return true;
  return url.includes('googleusercontent.com') && url.includes('fcrop64');
}

// yt-dlp lists a channel's square avatar and its wide banner in the same thumbnails array
export function pickChannelAvatar(thumbnails: YtdlpThumbnailJson[] | undefined): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;

  const avatars = thumbnails.filter((thumbnail) => thumbnail.url && !isBanner(thumbnail));
  // yt3.ggpht.com is YouTube's avatar CDN, so its images are preferred
  const ggphtAvatars = avatars.filter((thumbnail) => thumbnail.url?.includes('yt3.ggpht.com'));
  let candidates = thumbnails;
  if (ggphtAvatars.length > 0) candidates = ggphtAvatars;
  else if (avatars.length > 0) candidates = avatars;

  let best = candidates[0];
  for (const candidate of candidates) {
    if (best === undefined || resolutionOf(candidate) > resolutionOf(best)) best = candidate;
  }
  return best?.url ?? null;
}
