import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import multer from 'multer';

import { ValidationError } from '../lib/errors.ts';

import type { RequestHandler } from 'express';

// a two hour 1080p recording is well under this
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

const MEDIA_EXTENSIONS = /\.(mp3|mp4|wav|m4a|ogg|flac|aac|webm|mkv|mov|avi|wma)$/i;

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    // FFmpeg picks its decoder from the extension, so the temporary copy keeps it
    filename: (_req, file, callback) => {
      callback(null, `kinetube-upload-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (MEDIA_EXTENSIONS.test(file.originalname)) {
      callback(null, true);
      return;
    }
    callback(new ValidationError(`"${file.originalname}" isn't an audio or video file KineTube can transcribe.`));
  },
});

const acceptFile = upload.single('file');

// a multipart request carries an uploaded file; a JSON request names a file already on disk
export const acceptUpload: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }
  acceptFile(req, res, next);
};
