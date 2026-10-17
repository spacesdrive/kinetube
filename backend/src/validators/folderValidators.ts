import path from 'node:path';

import { ValidationError } from '../lib/errors.ts';
import { requiredString } from './fields.ts';
import { exampleFolderPath } from './pathExamples.ts';

// the folder path arrives URL-encoded as one path segment: /folders/C%3A%5CUsers%5CVideos
export function parseFolderPath(value: unknown): string {
  const folderPath = requiredString(value, 'path');
  if (!path.isAbsolute(folderPath)) throw new ValidationError(`The folder must be a full path, such as ${exampleFolderPath()}.`);
  return folderPath;
}
