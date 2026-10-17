const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const CHANNEL_PATH_PATTERN = /^\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)/;

function readUrl(text: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
}

const bareHost = (url: URL): string => url.hostname.replace(/^(www\.|m\.)/, '');

function cleanYouTubePath(url: URL): string | null {
  const host = bareHost(url);
  const pathname = url.pathname.replace(/\/$/, '');

  if (host === 'youtu.be') {
    const videoId = pathname.slice(1).split('/')[0] ?? '';
    return VIDEO_ID_PATTERN.test(videoId) ? `https://youtu.be/${videoId}` : null;
  }
  if (pathname === '/watch') {
    const videoId = url.searchParams.get('v') ?? '';
    return VIDEO_ID_PATTERN.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : null;
  }

  const shortsId = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (shortsId) return `https://www.youtube.com/shorts/${shortsId}`;
  if (CHANNEL_PATH_PATTERN.test(pathname)) return `https://www.youtube.com${pathname}`;
  return null;
}

// shows a clean link the moment it is pasted: "youtu.be/ID?si=xyz" -> "https://youtu.be/ID"
export function cleanYouTubeUrl(raw: string): string {
  const trimmed = raw.trim();
  const url = readUrl(trimmed);
  if (!url) return trimmed;

  const host = bareHost(url);
  if (host !== 'youtube.com' && host !== 'youtu.be') return trimmed;
  return cleanYouTubePath(url) ?? trimmed;
}

// "instagram.com/reel/CODE/?igsh=xyz" -> "https://www.instagram.com/reel/CODE/"
export function cleanInstagramUrl(raw: string): string {
  const trimmed = raw.trim();
  const url = readUrl(trimmed);
  if (!url || bareHost(url) !== 'instagram.com') return trimmed;

  const pathname = url.pathname.replace(/\/+$/, '');
  const postCode = pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/)?.[1];
  if (postCode) return `https://www.instagram.com/p/${postCode}/`;

  const reelCode = pathname.match(/^\/reels?\/([a-zA-Z0-9_-]+)/)?.[1];
  if (reelCode) return `https://www.instagram.com/reel/${reelCode}/`;

  if (/^\/[\w.]+/.test(pathname)) return `https://www.instagram.com${pathname}/`;
  return trimmed;
}

export function isInstagramLink(text: string): boolean {
  return /instagram\.com/i.test(text);
}
