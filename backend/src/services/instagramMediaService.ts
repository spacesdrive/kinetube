import { ToolNotInstalledError, ValidationError } from '../lib/errors.ts';
import { isProfileUrl, parseInstagramUrl } from '../platforms/instagram/instagramUrl.ts';
import { fetchInstagramPost } from './instagram/postFetcher.ts';
import { scrapeProfile } from './instagram/profileScraper.ts';
import { pickSessionAccount } from './instagram/sessionAccount.ts';
import { YTDLP_MISSING } from './youtubeMediaService.ts';

import type { InstagramMedia, InstagramMediaEvents } from '@shared/instagram.ts';
import type { EventSink } from '../lib/sse.ts';
import type { FfmpegManager } from '../managers/ffmpeg/ffmpegManager.ts';
import type { InstaloaderManager } from '../managers/instaloader/instaloaderManager.ts';
import type { YtdlpManager } from '../managers/ytdlp/ytdlpManager.ts';
import type { ParsedInstagramUrl } from '../platforms/instagram/instagramUrl.ts';
import type { InstagramAccountStore } from '../stores/instagramAccountStore.ts';
import type { StreamJob } from './streamJob.ts';

export interface InstagramMediaService {
  get(rawUrl: string, account: string | null): Promise<InstagramMedia>;
  // the same lookup, sending the profile header and per-post progress while a profile is read
  stream(rawUrl: string, account: string | null): StreamJob<InstagramMediaEvents>;
}

export interface InstagramMediaDeps {
  ytdlp: YtdlpManager;
  ffmpeg: FfmpegManager;
  instaloader: InstaloaderManager;
  accounts: InstagramAccountStore;
  sessionsDir: string;
}

type MediaProgressSink = EventSink<Omit<InstagramMediaEvents, 'done'>>;

const NOT_AN_INSTAGRAM_LINK = "That isn't an Instagram post, reel, story or profile link. Paste a link from instagram.com.";

export function createInstagramMediaService(deps: InstagramMediaDeps): InstagramMediaService {
  const { ytdlp, ffmpeg, instaloader, accounts, sessionsDir } = deps;

  function parseOrThrow(rawUrl: string): ParsedInstagramUrl {
    const parsed = parseInstagramUrl(rawUrl);
    if (!parsed) throw new ValidationError(NOT_AN_INSTAGRAM_LINK);
    if (!isProfileUrl(parsed) && !ytdlp.isInstalled()) throw new ToolNotInstalledError(YTDLP_MISSING);
    return parsed;
  }

  async function lookUp(parsed: ParsedInstagramUrl, account: string | null, send: MediaProgressSink, signal?: AbortSignal): Promise<InstagramMedia> {
    if (isProfileUrl(parsed)) {
      const sessionUsername = pickSessionAccount(accounts, account);
      const helper = await instaloader.startHelper('profile');
      signal?.addEventListener('abort', () => helper.kill(), { once: true });
      try {
        return await scrapeProfile({ helper, profile: parsed, sessionUsername, sessionsDir, send });
      } finally {
        helper.kill();
      }
    }

    const shortcode = 'shortcode' in parsed ? parsed.shortcode : null;
    return fetchInstagramPost({
      ytdlp,
      post: { urlType: parsed.urlType, cleanUrl: parsed.cleanUrl, shortcode },
      ffmpegDir: ffmpeg.isInstalled() ? ffmpeg.binaryDir : null,
    });
  }

  return {
    get(rawUrl, account) {
      const parsed = parseOrThrow(rawUrl);
      return lookUp(parsed, account, () => {});
    },

    stream(rawUrl, account) {
      const parsed = parseOrThrow(rawUrl);
      return async (send, signal) => {
        const media = await lookUp(parsed, account, send, signal);
        send('done', { success: true, message: 'Loaded', media });
      };
    },
  };
}
