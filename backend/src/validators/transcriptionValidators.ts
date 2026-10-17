import path from 'node:path';

import { NotFoundError, ValidationError } from '../lib/errors.ts';
import { WHISPER_MODEL_IDS } from '../managers/whisper/whisperModels.ts';
import { optionalOneOf, optionalString, readObject, requiredString } from './fields.ts';
import { exampleFilePath } from './pathExamples.ts';

import type { WhisperModelId } from '@shared/transcriptions.ts';
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

export function parseCreateTranscription(body: unknown): TranscriptionInput {
  const fields = readObject(body);
  const filePath = requiredString(fields.filePath, 'filePath');
  if (!path.isAbsolute(filePath)) throw new ValidationError(`"filePath" must be a full path, such as ${exampleFilePath()}.`);

  return {
    filePath,
    modelId: optionalOneOf(fields.modelId, 'modelId', WHISPER_MODEL_IDS, 'base'),
    language: parseLanguage(fields.language),
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
    isUpload: true,
  };
}
