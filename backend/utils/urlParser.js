/**
 * Parse and validate a YouTube URL.
 * Returns a parsed object or null if invalid.
 *
 * Supported types:
 *   'video'           — youtube.com/watch?v=ID or youtu.be/ID
 *   'shorts'          — youtube.com/shorts/ID
 *   'channel_videos'  — /@handle/videos, /channel/UCxxx/videos, etc.
 *   'channel_shorts'  — /@handle/shorts
 *   'channel'         — /@handle (redirected to /videos tab)
 */
function parseYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim();

  // Strip trailing hash/fragment
  url = url.split('#')[0];

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^(www\.|m\.)/, '');

  if (hostname !== 'youtube.com' && hostname !== 'youtu.be') {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/$/, ''); // strip trailing slash

  // ── youtu.be short links ──────────────────────────────────────────────────
  if (hostname === 'youtu.be') {
    const videoId = pathname.slice(1).split('/')[0];
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return {
        type: 'video',
        id: videoId,
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }
    return null;
  }

  // ── youtube.com/shorts/ID ─────────────────────────────────────────────────
  const shortsMatch = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return {
      type: 'shorts',
      id: shortsMatch[1],
      cleanUrl: `https://www.youtube.com/shorts/${shortsMatch[1]}`,
    };
  }

  // ── youtube.com/watch?v=ID ────────────────────────────────────────────────
  const videoId = parsed.searchParams.get('v');
  if (pathname === '/watch' && videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return {
      type: 'video',
      id: videoId,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  // Helper to build the channel base path
  const channelPathPattern =
    /^\/((?:@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+))/;

  // ── Channel /videos tab ───────────────────────────────────────────────────
  const channelVideosMatch = pathname.match(
    /^\/((?:@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+))\/videos$/
  );
  if (channelVideosMatch) {
    return {
      type: 'channel_videos',
      id: null,
      channelPath: channelVideosMatch[1],
      cleanUrl: `https://www.youtube.com/${channelVideosMatch[1]}/videos`,
    };
  }

  // ── Channel /shorts tab ───────────────────────────────────────────────────
  const channelShortsMatch = pathname.match(
    /^\/((?:@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+))\/shorts$/
  );
  if (channelShortsMatch) {
    return {
      type: 'channel_shorts',
      id: null,
      channelPath: channelShortsMatch[1],
      cleanUrl: `https://www.youtube.com/${channelShortsMatch[1]}/shorts`,
    };
  }

  // ── Generic channel URL (no tab specified) ────────────────────────────────
  const channelBaseMatch = pathname.match(channelPathPattern);
  if (channelBaseMatch && pathname === channelBaseMatch[0]) {
    return {
      type: 'channel',
      id: null,
      channelPath: channelBaseMatch[1],
      cleanUrl: `https://www.youtube.com/${channelBaseMatch[1]}/videos`,
    };
  }

  return null;
}

module.exports = { parseYouTubeUrl };
