import multer from 'multer';

import { AppError, NotFoundError, UNEXPECTED_ERROR_MESSAGE, ValidationError } from '../lib/errors.ts';
import { isRecord } from '../lib/lineSplitter.ts';

import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorResponse } from '@shared/api.ts';
import type { Logger } from '../lib/logger.ts';

const UPLOAD_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: 'The file is larger than 2 GB. Trim it or use a smaller file.',
  LIMIT_FILE_COUNT: 'Upload one file at a time.',
  LIMIT_UNEXPECTED_FILE: 'Attach the file in a field called "file".',
};

// express.json() and multer throw their own errors; they become the same typed errors as everything else
function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (error instanceof multer.MulterError) return new ValidationError(UPLOAD_MESSAGES[error.code] ?? error.message);
  if (isRecord(error) && error.type === 'entity.parse.failed') return new ValidationError("The request body isn't valid JSON.");
  if (isRecord(error) && error.type === 'entity.too.large') return new ValidationError('The request body is larger than 1 MB.');
  return null;
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const appError = toAppError(error);
    const { requestId } = res.locals;
    if (!appError) logger.error('Unexpected error', { requestId, method: req.method, path: req.path, error });

    // a stream that already started reports its own failure in its done event
    if (res.headersSent) {
      res.end();
      return;
    }

    const body: ErrorResponse = {
      success: false,
      code: appError?.code ?? 'INTERNAL',
      message: appError?.message ?? UNEXPECTED_ERROR_MESSAGE,
      requestId,
    };
    res.status(appError?.status ?? 500).json(body);
  };
}

export const apiNotFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`There's no API route for ${req.method} ${req.originalUrl.split('?')[0]}.`));
};
