import { ToolNotInstalledError, UpstreamError, UpstreamTimeoutError, ValidationError } from '../lib/errors.ts';
import { buildMetadataArgs } from '../managers/ytdlp/ytdlpArgs.ts';
import { summarizeErrorOutput } from '../managers/ytdlp/ytdlpOutput.ts';
import { parseYtdlpJson } from '../platforms/ytdlpJson.ts';
import { mapYouTubeMedia } from '../platforms/youtube/youtubeMetadata.ts';
import { parseYouTubeUrl } from '../platforms/youtube/youtubeUrl.ts';

import type { YouTubeMedia } from '@shared/youtube.ts';
import type { YtdlpManager } from '../managers/ytdlp/ytdlpManager.ts';

export interface YouTubeMediaService {
  get(rawUrl: string): Promise<YouTubeMedia>;
}

// one video answers in seconds; listing a channel or playlist with thousands of videos can take a few minutes
export const VIDEO_TIMEOUT_MS = 60_000;
export const LIST_TIMEOUT_MS = 5 * 60_000;

export const NOT_A_YOUTUBE_LINK = "That isn't a YouTube video, Shorts, channel or playlist link. Paste a link from youtube.com or youtu.be.";
export const YTDLP_MISSING = 'yt-dlp is not installed yet. Finish setup first.';

export function createYouTubeMediaService(ytdlp: YtdlpManager): YouTubeMediaService {
  return {
    async get(rawUrl) {
      const parsed = parseYouTubeUrl(rawUrl);
      if (!parsed) throw new ValidationError(NOT_A_YOUTUBE_LINK);
      if (!ytdlp.isInstalled()) throw new ToolNotInstalledError(YTDLP_MISSING);

      // a channel tab and a playlist are listed flat, without opening each video
      const isList = !('videoId' in parsed);
      const args = buildMetadataArgs({ url: parsed.cleanUrl, isPlaylist: isList, ffmpegDir: null, cookiesPath: null });
      const result = await ytdlp.runMetadata(args, isList ? LIST_TIMEOUT_MS : VIDEO_TIMEOUT_MS);

      if (result.isTimedOut) throw new UpstreamTimeoutError('YouTube took too long to answer. Try again in a moment.');
      if (result.exitCode !== 0) {
        const reason = summarizeErrorOutput(result.stderr) || 'yt-dlp gave no reason.';
        throw new UpstreamError(`Couldn't read this link from YouTube. ${reason}`);
      }

      const json = parseYtdlpJson(result.stdout);
      if (!json) throw new UpstreamError("yt-dlp's answer couldn't be read. Update yt-dlp in Settings, then try again.");
      return mapYouTubeMedia(json, parsed);
    },
  };
}
