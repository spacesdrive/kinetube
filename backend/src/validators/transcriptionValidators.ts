import path from 'node:path';

import { NotFoundError, ValidationError } from '../lib/errors.ts';
import { TRANSCRIPT_FORMATS } from '../managers/whisper/whisperFormats.ts';
import { WHISPER_MODEL_IDS } from '../managers/whisper/whisperModels.ts';
import { oneOf, optionalOneOf, optionalString, readObject, requiredString } from './fields.ts';
import { exampleFilePath } from './pathExamples.ts';

import type { TranscriptFormat, WhisperModelId } from '@shared/transcriptions.ts';
import type { TranscriptionInput } from '../services/transcriptionService.ts';

// auto detection, or an ISO 639 language code such as en or yue
const LANGUAGE_PATTERN = /^(auto|[a-z]{2,3})$/;

export function parseModelId(value: unknown): WhisperModelId {
  const modelId = WHISPER_MODEL_IDS.find((candidate) => candidate === value);
  if (!modelId) throw new NotFoundError(`There's no whisper model called "${String(value)}".`);
  return modelId;
}

function parseLanguage(value: unknown): string {
  const language = optionalString(value, 'language', 8)?.trim().toLowerCase() || 'auto';
  if (!LANGUAGE_PATTERN.test(language)) throw new ValidationError('"language" must be "auto" or a language code such as "en".');
  return language;
}

// ["srt", "txt", "srt"] -> ["srt", "txt"]; left out means plain text only
export function parseFormats(value: unknown): TranscriptFormat[] {
  if (value === undefined || value === null) return ['txt'];
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError(`"formats" must be a list with at least one of: ${TRANSCRIPT_FORMATS.join(', ')}.`);
  return [...new Set(value.map((format) => oneOf(format, 'formats', TRANSCRIPT_FORMATS)))];
}

export function parseCreateTranscription(body: unknown): TranscriptionInput {
  const fields = readObject(body);
  const filePath = requiredString(fields.filePath, 'filePath');
  if (!path.isAbsolute(filePath)) throw new ValidationError(`"filePath" must be a full path, such as ${exampleFilePath()}.`);

  return {
    filePath,
    modelId: optionalOneOf(fields.modelId, 'modelId', WHISPER_MODEL_IDS, 'base'),
    language: parseLanguage(fields.language),
    formats: parseFormats(fields.formats),
    isUpload: false,
  };
}

// multipart text fields arrive as strings beside the uploaded file
export function parseUploadedTranscription(body: unknown, uploadedPath: string | undefined): TranscriptionInput {
  if (!uploadedPath) throw new ValidationError('Attach the audio or video file in a "file" field.');
  const fields = readObject(body ?? {});

  return {
    filePath: uploadedPath,
    modelId: optionalOneOf(fields.modelId, 'modelId', WHISPER_MODEL_IDS, 'base'),
    language: parseLanguage(fields.language),
    formats: [],
    isUpload: true,
  };
}
