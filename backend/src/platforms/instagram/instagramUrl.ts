import { bareHostname, readUrl } from '../urlBasics.ts';

import type { InstagramPost, InstagramProfile } from '@shared/instagram.ts';

export type ParsedInstagramUrl =
  | { urlType: 'post' | 'reel'; shortcode: string; cleanUrl: string }
  | { urlType: 'story'; username: string; storyId: string | null; cleanUrl: string }
  | { urlType: InstagramProfile['urlType']; username: string; cleanUrl: string };

export type InstagramPostUrlType = InstagramPost['urlType'];

// first path segments that belong to Instagram itself, never to a profile
const RESERVED_PATHS = new Set([
  'explore', 'accounts', 'direct', 'tv', 'ar', 'reels', 'stories', 'p', 'reel', 'web', 'directory', 'login', 'oauth',
]);

const BASE_URL = 'https://www.instagram.com';

function parseProfilePath(pathname: string): ParsedInstagramUrl | null {
  const match = pathname.match(/^\/([\w.]+)(?:\/(reels|tagged))?$/);
  const username = match?.[1];
  if (!username || RESERVED_PATHS.has(username)) return null;

  const tab = match[2];
  if (tab === 'reels') return { urlType: 'profile-reels', username, cleanUrl: `${BASE_URL}/${username}/reels/` };
  if (tab === 'tagged') return { urlType: 'profile-tagged', username, cleanUrl: `${BASE_URL}/${username}/tagged/` };
  return { urlType: 'profile', username, cleanUrl: `${BASE_URL}/${username}/` };
}

// share links carry igsh, utm_* and similar parameters; the clean URL keeps only the path
export function parseInstagramUrl(rawUrl: unknown): ParsedInstagramUrl | null {
  const url = readUrl(rawUrl);
  if (!url || bareHostname(url) !== 'instagram.com') return null;

  const pathname = url.pathname.replace(/\/+$/, '');

  const postCode = pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/)?.[1];
  if (postCode) return { urlType: 'post', shortcode: postCode, cleanUrl: `${BASE_URL}/p/${postCode}/` };

  // /reels/CODE works too, but /reel/CODE is the canonical form
  const reelCode = pathname.match(/^\/reels?\/([a-zA-Z0-9_-]+)/)?.[1];
  if (reelCode) return { urlType: 'reel', shortcode: reelCode, cleanUrl: `${BASE_URL}/reel/${reelCode}/` };

  const storyMatch = pathname.match(/^\/stories\/([\w.]+)(?:\/(\d+))?/);
  const storyUser = storyMatch?.[1];
  if (storyUser) {
    const storyId = storyMatch[2] ?? null;
    const cleanUrl = storyId ? `${BASE_URL}/stories/${storyUser}/${storyId}/` : `${BASE_URL}/stories/${storyUser}/`;
    return { urlType: 'story', username: storyUser, storyId, cleanUrl };
  }

  return parseProfilePath(pathname);
}

export function isProfileUrl(parsed: ParsedInstagramUrl): parsed is Extract<ParsedInstagramUrl, { urlType: InstagramProfile['urlType'] }> {
  return parsed.urlType === 'profile' || parsed.urlType === 'profile-reels' || parsed.urlType === 'profile-tagged';
}
