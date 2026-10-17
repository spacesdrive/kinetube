import { Readable } from 'node:stream';

import { ForbiddenError, UpstreamError, ValidationError } from '../lib/errors.ts';

import type { ReadableStream as WebReadableStream } from 'node:stream/web';

export interface ProxiedImage {
  contentType: string;
  body: Readable;
}

export interface ImageProxyService {
  fetchImage(rawUrl: string): Promise<ProxiedImage>;
}

// Instagram and YouTube block hotlinked images, so thumbnails load through here; never widen this without an SSRF review
export const IMAGE_PROXY_ALLOWED_HOSTS = [
  'cdninstagram.com', 'fbcdn.net', 'instagram.com', 'pinimg.com',
  'yt3.ggpht.com', 'yt3.googleusercontent.com', 'ytimg.com', 'i.ytimg.com',
];

// CDN redirects stay on the CDN; three hops is plenty, and each one is checked against the list
const MAX_REDIRECTS = 3;
const IMAGE_TIMEOUT_MS = 10_000;
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// "cdninstagram.com" allows "scontent.cdninstagram.com" but never "evilcdninstagram.com"
export function isAllowedImageHost(hostname: string): boolean {
  return IMAGE_PROXY_ALLOWED_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

function refererFor(hostname: string): string {
  if (/ytimg\.com|ggpht\.com|googleusercontent\.com/.test(hostname)) return 'https://www.youtube.com/';
  if (/instagram\.com|fbcdn\.net/.test(hostname)) return 'https://www.instagram.com/';
  return 'https://www.google.com/';
}

function checkedUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError('The image address is not a valid URL.');
  }
  if (url.protocol !== 'https:' || !isAllowedImageHost(url.hostname)) {
    throw new ForbiddenError('Images can only be loaded from Instagram and YouTube.');
  }
  return url;
}

async function fetchFollowingAllowedRedirects(startUrl: URL, fetchImpl: typeof fetch): Promise<Response> {
  let url = startUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetchImpl(url, {
      redirect: 'manual',
      headers: { 'User-Agent': BROWSER_USER_AGENT, Referer: refererFor(url.hostname), Accept: 'image/webp,image/apng,image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) return response;
    url = checkedUrl(new URL(location, url).toString());
  }
  throw new UpstreamError('The image redirected too many times.');
}

export function createImageProxyService(fetchImpl: typeof fetch = fetch): ImageProxyService {
  return {
    async fetchImage(rawUrl) {
      const response = await fetchFollowingAllowedRedirects(checkedUrl(rawUrl), fetchImpl).catch((error: unknown) => {
        if (error instanceof ForbiddenError || error instanceof UpstreamError) throw error;
        throw new UpstreamError(`Couldn't load the image: ${(error as Error).message}`);
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !response.body) throw new UpstreamError(`The image host answered with status ${response.status}.`);
      if (!contentType.startsWith('image/')) throw new UpstreamError('The address did not point to an image.');

      return { contentType, body: Readable.fromWeb(response.body as WebReadableStream<Uint8Array>) };
    },
  };
}
