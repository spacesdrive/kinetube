// Strips every query param except the essential ones so users see a clean URL
// the instant they paste. Works for all YouTube URL patterns:
//
//   youtu.be/ID?si=xyz&pp=abc   ->  https://youtu.be/ID
//   youtube.com/watch?v=ID&si=  ->  https://www.youtube.com/watch?v=ID
//   youtube.com/shorts/ID?si=   ->  https://www.youtube.com/shorts/ID
//   youtube.com/@channel?...    ->  https://www.youtube.com/@channel
//
// If the URL is not a recognized YouTube URL it is returned unchanged.
export function cleanYouTubeUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^(www\.|m\.)/, '');

    if (host !== 'youtube.com' && host !== 'youtu.be') return trimmed;

    const path = u.pathname.replace(/\/$/, '');

    // youtu.be/ID  — drop every query param and fragment
    if (host === 'youtu.be') {
      const id = path.slice(1).split('/')[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return `https://youtu.be/${id}`;
      }
    }

    // /watch?v=ID  — keep only the v param
    if (path === '/watch') {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
    }

    // /shorts/ID
    const shortsM = path.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsM) return `https://www.youtube.com/shorts/${shortsM[1]}`;

    // channel URLs — keep path, drop all query params
    if (/^\/((?:@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+))/.test(path)) {
      return `https://www.youtube.com${path}`;
    }
  } catch { /* not a parseable URL - fall through to the trimmed-input fallback below */ }
  return trimmed;
}

// Strips tracking params (utm_*, igsh, igshid) from Instagram URLs on paste.
export function cleanInstagramUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^(www\.|m\.)/, '');
    if (host !== 'instagram.com') return trimmed;

    const path = u.pathname.replace(/\/+$/, '');

    // /p/SHORTCODE — post
    const postM = path.match(/^\/p\/([a-zA-Z0-9_-]+)/);
    if (postM) return `https://www.instagram.com/p/${postM[1]}/`;

    // /reel/SHORTCODE or /reels/SHORTCODE
    const reelM = path.match(/^\/reels?\/([a-zA-Z0-9_-]+)/);
    if (reelM) return `https://www.instagram.com/reel/${reelM[1]}/`;

    // /stories/USERNAME — keep path, drop all params
    if (path.startsWith('/stories/')) return `https://www.instagram.com${path}/`;

    // /USERNAME — profile, drop all params
    const profileM = path.match(/^\/([\w.]+)/);
    if (profileM) return `https://www.instagram.com${path}/`;
  } catch { /* not a parseable URL - fall through to the trimmed-input fallback below */ }
  return trimmed;
}
