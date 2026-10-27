import { NotFoundError, ValidationError } from '../lib/errors.ts';
import { VIDEO_QUALITIES } from '../managers/ytdlp/ytdlpFormats.ts';
import { parseDownloadTarget } from '../platforms/mediaUrl.ts';
import { parseYouTubeUrl } from '../platforms/youtube/youtubeUrl.ts';
import { DOWNLOAD_ID_PATTERN } from '../services/downloads/downloadIds.ts';
import { parseOptionalUsername } from './instagramValidators.ts';
import { parseTranscriptionChoices } from './transcriptionValidators.ts';
import { oneOf, optionalBoolean, optionalInteger, optionalOneOf, optionalString, queryValue, readObject, requiredString } from './fields.ts';

import type { DownloadOptions, DownloadStatus, FileNameOptions } from '@shared/downloads.ts';
import type { DownloadTarget } from '../platforms/mediaUrl.ts';
import type { CreateBatchInput } from '../services/downloadBatchService.ts';
import type { CreateDownloadInput } from '../services/downloadService.ts';

const DOWNLOAD_STATUSES: readonly DownloadStatus[] = ['active', 'paused', 'interrupted'];

// names longer than this hit the 255 character file name limit once yt-dlp adds the title
const MAX_NAME_PART_LENGTH = 100;
const MAX_TEMPLATE_LENGTH = 200;
const MAX_SEQUENCE_NUMBER = 99_999;

// a batch is a channel or profile page the person picked from; 1000 covers the largest ones
const MAX_BATCH_ITEMS = 1_000;

const NOT_DOWNLOADABLE = "That link can't be downloaded. Use a single YouTube video or Shorts link, or an Instagram post, reel or story.";
const WHOLE_LIST_LINK = "A channel or playlist link can't be downloaded in one go. Open it on the YouTube page and pick the videos to download.";

function parseTarget(value: unknown, field: string): DownloadTarget {
  const rawUrl = requiredString(value, field);
  const target = parseDownloadTarget(rawUrl);
  if (target) return target;
  // every YouTube link that is not a single video is a channel tab or a playlist
  throw new ValidationError(parseYouTubeUrl(rawUrl) ? WHOLE_LIST_LINK : NOT_DOWNLOADABLE);
}

function parseFileName(value: unknown): FileNameOptions {
  const fields = value === undefined || value === null ? {} : readObject(value, '"fileName"');
  return {
    prefix: optionalString(fields.prefix, 'fileName.prefix', MAX_NAME_PART_LENGTH) ?? '',
    suffix: optionalString(fields.suffix, 'fileName.suffix', MAX_NAME_PART_LENGTH) ?? '',
    template: optionalString(fields.template, 'fileName.template', MAX_TEMPLATE_LENGTH) ?? '',
    sequenceNumber: optionalInteger(fields.sequenceNumber, 'fileName.sequenceNumber', { min: 1, max: MAX_SEQUENCE_NUMBER }),
  };
}

// every option has a default, so { url } alone is a complete request
function parseOptions(fields: Record<string, unknown>): DownloadOptions {
  return {
    quality: optionalOneOf(fields.quality, 'quality', VIDEO_QUALITIES, 'best'),
    isAudioOnly: optionalBoolean(fields.isAudioOnly, 'isAudioOnly', false),
    outputDir: optionalString(fields.outputDir, 'outputDir')?.trim() || null,
    fileName: parseFileName(fields.fileName),
    account: parseOptionalUsername(fields.account),
  };
}

export function parseCreateDownload(body: unknown): CreateDownloadInput {
  const fields = readObject(body);
  return { target: parseTarget(fields.url, 'url'), options: parseOptions(fields) };
}

export function parseCreateBatch(body: unknown): CreateBatchInput {
  const fields = readObject(body);
  if (!Array.isArray(fields.items) || fields.items.length === 0) throw new ValidationError('"items" must list at least one link.');
  if (fields.items.length > MAX_BATCH_ITEMS) throw new ValidationError(`A batch can hold up to ${MAX_BATCH_ITEMS} links.`);

  const items = fields.items.map((rawItem: unknown, index: number) => {
    const item = readObject(rawItem, `items[${index}]`);
    const target = parseTarget(item.url, `items[${index}].url`);
    return {
      target,
      title: optionalString(item.title, `items[${index}].title`, MAX_TEMPLATE_LENGTH) ?? target.cleanUrl,
      shouldTranscribe: optionalBoolean(item.shouldTranscribe, `items[${index}].shouldTranscribe`, false),
    };
  });
  return { items, options: parseOptions(fields), transcription: parseTranscriptionChoices(fields.transcription) };
}

export function parseDownloadId(value: unknown): string {
  // an id in the wrong shape cannot belong to any download
  if (typeof value !== 'string' || !DOWNLOAD_ID_PATTERN.test(value)) throw new NotFoundError("That download doesn't exist.");
  return value;
}

export function parseDownloadStatus(query: Record<string, unknown>): DownloadStatus | null {
  const status = queryValue(query.status);
  return status ? oneOf(status, 'status', DOWNLOAD_STATUSES) : null;
}
