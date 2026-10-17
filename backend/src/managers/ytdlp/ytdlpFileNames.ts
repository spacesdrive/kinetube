import path from 'node:path';

import type { FileNameOptions } from '@shared/downloads.ts';

// characters no file system on Windows accepts in a file name
const INVALID_NAME_CHARACTERS = /[\\/:*?"<>|]/g;

// plain text the person typed; % is doubled so yt-dlp does not read it as the start of a template field
export function sanitizeNamePart(text: string): string {
  return text.replace(/%/g, '%%').replace(INVALID_NAME_CHARACTERS, '').trim();
}

// a yt-dlp template keeps its %(field)s syntax, so only invalid characters are removed
export function sanitizeTemplate(text: string): string {
  return text.replace(INVALID_NAME_CHARACTERS, '').trim();
}

// { sequenceNumber: 1, prefix: "Clip" } -> "01 - Clip %(title)s [%(id)s].%(ext)s"
export function buildFileNameTemplate(options: FileNameOptions): string {
  const { prefix, suffix, template, sequenceNumber } = options;
  const customTemplate = sanitizeTemplate(template);
  const cleanPrefix = sanitizeNamePart(prefix);
  const cleanSuffix = sanitizeNamePart(suffix);
  const parts: string[] = [];

  if (sequenceNumber !== null) parts.push(`${String(sequenceNumber).padStart(2, '0')} -`);
  if (cleanPrefix) parts.push(cleanPrefix);
  parts.push(customTemplate || '%(title)s');
  if (cleanSuffix) parts.push(cleanSuffix);
  // a custom template owns the whole name, so the video id is only added to the default one
  if (!customTemplate) parts.push('[%(id)s]');

  return `${parts.join(' ')}.%(ext)s`;
}

// "My_Title [abc123XYZ].f140.m4a" -> "My Title"
export function titleFromPath(filePath: string): string {
  return path
    .basename(filePath)
    .replace(/\.f\d+\.\w+$/, '')
    .replace(/\.\w{2,4}$/, '')
    .replace(/\s*\[[\w-]{6,}\]\s*$/, '')
    .replace(/_/g, ' ')
    .trim();
}

// "Title.f299.webm" merged with its audio -> "Title.mp4"; an audio-only "Title.webm" -> "Title.mp3"
export function finalFilePath(firstDestination: string, isMultiFile: boolean, isAudioOnly: boolean): string {
  if (isAudioOnly) return firstDestination.replace(/\.[^.]+$/, '.mp3');
  if (!isMultiFile) return firstDestination;

  const formatMatch = firstDestination.match(/^(.+?)\.f\d+\.[^.]+$/);
  const basePath = formatMatch?.[1] ?? firstDestination.replace(/\.[^.]+$/, '');
  return `${basePath}.mp4`;
}
