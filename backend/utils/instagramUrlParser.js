/**
 * Parse and clean Instagram URLs.
 *
 * Tracking / sharing params stripped:
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term,
 *   igsh, igshid, img_index, si, ref, hl
 *
 * Supported types:
 *   'post'            — /p/SHORTCODE
 *   'reel'            — /reel/SHORTCODE  or  /reels/SHORTCODE
 *   'story'           — /stories/USERNAME[/STORY_ID]
 *   'profile'         — /USERNAME
 *   'profile_reels'   — /USERNAME/reels
 *   'profile_tagged'  — /USERNAME/tagged
 */

const RESERVED_PATHS = new Set([
  'explore', 'accounts', 'direct', 'tv', 'ar', 'reels',
  'stories', 'p', 'reel', 'web', 'directory', 'login', 'oauth',
]);

function parseInstagramUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim().split('#')[0];
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed;
  try { parsed = new URL(url); } catch { return null; }

  const hostname = parsed.hostname.replace(/^(www\.|m\.)/, '');
  if (hostname !== 'instagram.com') return null;

  // Remove trailing slashes for consistent matching
  const pathname = parsed.pathname.replace(/\/+$/, '');

  // ── /p/SHORTCODE ─────────────────────────────────────────────────────────
  const postMatch = pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/);
  if (postMatch) {
    return {
      type: 'post',
      shortcode: postMatch[1],
      cleanUrl: `https://www.instagram.com/p/${postMatch[1]}/`,
    };
  }

  // ── /reel/SHORTCODE  or  /reels/SHORTCODE ────────────────────────────────
  const reelMatch = pathname.match(/^\/reels?\/([a-zA-Z0-9_-]+)/);
  if (reelMatch) {
    return {
      type: 'reel',
      shortcode: reelMatch[1],
      // Canonical form: /reel/ (singular) — also accessible as /p/
      cleanUrl: `https://www.instagram.com/reel/${reelMatch[1]}/`,
    };
  }

  // ── /stories/USERNAME[/STORY_ID] ─────────────────────────────────────────
  const storyMatch = pathname.match(/^\/stories\/([\w.]+)(?:\/(\d+))?/);
  if (storyMatch) {
    const cleanUrl = storyMatch[2]
      ? `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/`
      : `https://www.instagram.com/stories/${storyMatch[1]}/`;
    return {
      type: 'story',
      username: storyMatch[1],
      storyId: storyMatch[2] || null,
      cleanUrl,
    };
  }

  // ── /USERNAME/reels ──────────────────────────────────────────────────────
  const profileReelsMatch = pathname.match(/^\/([\w.]+)\/reels$/);
  if (profileReelsMatch && !RESERVED_PATHS.has(profileReelsMatch[1])) {
    return {
      type: 'profile_reels',
      username: profileReelsMatch[1],
      cleanUrl: `https://www.instagram.com/${profileReelsMatch[1]}/reels/`,
    };
  }

  // ── /USERNAME/tagged ─────────────────────────────────────────────────────
  const profileTaggedMatch = pathname.match(/^\/([\w.]+)\/tagged$/);
  if (profileTaggedMatch && !RESERVED_PATHS.has(profileTaggedMatch[1])) {
    return {
      type: 'profile_tagged',
      username: profileTaggedMatch[1],
      cleanUrl: `https://www.instagram.com/${profileTaggedMatch[1]}/tagged/`,
    };
  }

  // ── /USERNAME (profile root) ─────────────────────────────────────────────
  const profileMatch = pathname.match(/^\/([\w.]+)$/);
  if (profileMatch && !RESERVED_PATHS.has(profileMatch[1])) {
    return {
      type: 'profile',
      username: profileMatch[1],
      cleanUrl: `https://www.instagram.com/${profileMatch[1]}/`,
    };
  }

  return null;
}

module.exports = { parseInstagramUrl };
