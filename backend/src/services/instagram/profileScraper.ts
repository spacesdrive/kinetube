import { UpstreamError } from '../../lib/errors.ts';
import { isRecord } from '../../lib/lineSplitter.ts';

import type { InstagramMediaEvents, InstagramProfile, ProfileEntry } from '@shared/instagram.ts';
import type { PythonHelper } from '../../managers/instaloader/pythonHelper.ts';
import type { EventSink } from '../../lib/sse.ts';

export interface ProfileScrapeInput {
  helper: PythonHelper;
  profile: { urlType: InstagramProfile['urlType']; username: string; cleanUrl: string };
  sessionUsername: string | null;
  sessionsDir: string;
  send: EventSink<Omit<InstagramMediaEvents, 'done'>>;
}

// the helper stops after this many posts so a huge profile still answers in minutes
const MAX_POSTS = 500;

// instaloader waits between pages to stay under Instagram's limits, so 500 posts can take a few minutes
const SCRAPE_TIMEOUT_MS = 5 * 60_000;

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

function toEntry(post: unknown): ProfileEntry | null {
  if (!isRecord(post)) return null;
  const shortcode = asString(post.shortcode);
  if (!shortcode) return null;

  return {
    id: shortcode,
    shortcode,
    title: asString(post.title) || 'Untitled',
    url: asString(post.url) ?? `https://www.instagram.com/p/${shortcode}/`,
    thumbnailUrl: asString(post.thumbnail),
    duration: asNumber(post.duration),
    viewCount: asNumber(post.viewCount),
  };
}

// reads the helper's JSON lines until its done line: profile first, then one progress line per post
export async function scrapeProfile(input: ProfileScrapeInput): Promise<InstagramProfile> {
  const { helper, profile, sessionUsername, sessionsDir, send } = input;
  const deadline = Date.now() + SCRAPE_TIMEOUT_MS;
  let name = profile.username;
  let avatarUrl: string | null = null;

  helper.write({ username: profile.username, session_username: sessionUsername ?? '', sessions_dir: sessionsDir, max_posts: MAX_POSTS });

  for (;;) {
    const message = await helper.nextMessage(deadline - Date.now(), 'Reading the profile took more than 5 minutes. Try again in a while.');

    if (message.type === 'profile') {
      name = asString(message.channelName) || profile.username;
      avatarUrl = asString(message.avatar);
      send('profile', { username: profile.username, name, postCount: asNumber(message.mediacount) ?? 0, avatarUrl });
    } else if (message.type === 'progress') {
      send('progress', { fetchedCount: asNumber(message.fetched) ?? 0, totalCount: asNumber(message.mediacount) ?? 0 });
    } else if (message.type === 'done') {
      if (message.status !== 'success') throw new UpstreamError(asString(message.message) || "Couldn't read this Instagram profile.");

      const posts = Array.isArray(message.posts) ? message.posts : [];
      const entries = posts.map(toEntry).filter((entry) => entry !== null);
      return {
        kind: 'profile',
        urlType: profile.urlType,
        url: profile.cleanUrl,
        username: profile.username,
        name,
        avatarUrl,
        postCount: entries.length,
        isTruncated: message.truncated === true,
        entries,
      };
    }
  }
}
