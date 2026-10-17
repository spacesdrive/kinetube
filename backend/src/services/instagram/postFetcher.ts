import { setTimeout as sleep } from 'node:timers/promises';

import { UpstreamError, UpstreamTimeoutError } from '../../lib/errors.ts';
import { buildMetadataArgs } from '../../managers/ytdlp/ytdlpArgs.ts';
import { summarizeErrorOutput } from '../../managers/ytdlp/ytdlpOutput.ts';
import { hintForError, isRateLimited } from '../../platforms/instagram/instagramErrors.ts';
import { mapInstagramPost } from '../../platforms/instagram/instagramMetadata.ts';
import { parseYtdlpJson } from '../../platforms/ytdlpJson.ts';

import type { InstagramPost } from '@shared/instagram.ts';
import type { ProcessResult } from '../../lib/runProcess.ts';
import type { YtdlpManager } from '../../managers/ytdlp/ytdlpManager.ts';
import type { ParsedPostUrl } from '../../platforms/instagram/instagramMetadata.ts';

export interface PostFetchInput {
  ytdlp: YtdlpManager;
  post: ParsedPostUrl;
  cookiesPath: string | null;
  ffmpegDir: string | null;
}

// one post's metadata comes back in a few seconds; 30 seconds means Instagram is stalling
const POST_TIMEOUT_MS = 30_000;

// one retry after a short pause gets past most of Instagram's burst limits
const RATE_LIMIT_RETRY_DELAY_MS = 4_000;

async function runWithRetry(ytdlp: YtdlpManager, args: string[]): Promise<ProcessResult> {
  const firstTry = await ytdlp.runMetadata(args, POST_TIMEOUT_MS);
  if (firstTry.exitCode === 0 || !isRateLimited(firstTry.stderr)) return firstTry;

  await sleep(RATE_LIMIT_RETRY_DELAY_MS);
  return ytdlp.runMetadata(args, POST_TIMEOUT_MS);
}

export async function fetchInstagramPost({ ytdlp, post, cookiesPath, ffmpegDir }: PostFetchInput): Promise<InstagramPost> {
  const args = buildMetadataArgs({ url: post.cleanUrl, isPlaylist: false, ffmpegDir, cookiesPath });
  const result = await runWithRetry(ytdlp, args);

  if (result.isTimedOut) throw new UpstreamTimeoutError('Instagram took too long to answer. Try again in a moment.');
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    const detail = summarizeErrorOutput(result.stderr);
    throw new UpstreamError(`Couldn't read this post. ${hintForError(result.stderr)}${detail ? ` (${detail})` : ''}`);
  }

  const json = parseYtdlpJson(result.stdout);
  if (!json) throw new UpstreamError("yt-dlp's answer couldn't be read. Update yt-dlp in Settings, then try again.");
  return mapInstagramPost(json, post);
}
