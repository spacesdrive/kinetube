/**
 * Transcription API routes (whisper.cpp backend)
 *
 * GET  /api/transcribe/setup/check      — is whisper.cpp installed?
 * GET  /api/transcribe/setup            — SSE: download + install whisper.cpp
 * GET  /api/transcribe/models           — list models with readiness status
 * GET  /api/transcribe/model/ensure     — SSE: download a model (?model=base)
 * POST /api/transcribe/file             — SSE: transcribe a local file path
 * POST /api/transcribe/upload           — multipart: upload + transcribe audio
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const os       = require('os');

const {
  isWhisperReady,
  getAvailableModels,
  ensureWhisper,
  ensureModel,
  transcribeFile,
} = require('../utils/whisperManager');

// ── SSE helper ────────────────────────────────────────────────────────────────

function initSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  };
  const finish = () => { if (!res.writableEnded) { res.write('retry: 3600000\n\n'); res.end(); } };
  return { send, finish };
}

// ── multer: upload to OS temp dir ─────────────────────────────────────────────

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|mp4|wav|m4a|ogg|flac|aac|webm|mkv|mov|avi|wma)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname}`));
    }
  },
});

// ── Routes ─────────────────────────────────────────────────────────────────────

// Check whisper.cpp installation
router.get('/transcribe/setup/check', (_req, res) => {
  res.json({ ready: isWhisperReady(), models: getAvailableModels() });
});

// SSE: download + install whisper.cpp
router.get('/transcribe/setup', (req, res) => {
  const { send, finish } = initSSE(res);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  let lastError = '';
  ensureWhisper((event, data) => {
    send(event, data);
    if (data?.phase === 'error') lastError = data.message || '';
  })
    .then((ok) => {
      clearInterval(keepAlive);
      send('done', { success: ok, message: ok ? undefined : (lastError || 'Setup failed.'), models: getAvailableModels() });
      finish();
    })
    .catch((err) => {
      clearInterval(keepAlive);
      send('done', { success: false, message: err.message });
      finish();
    });

  res.on('close', () => clearInterval(keepAlive));
});

// List models
router.get('/transcribe/models', (_req, res) => {
  res.json({ models: getAvailableModels() });
});

// SSE: download a model
router.get('/transcribe/model/ensure', (req, res) => {
  const { model } = req.query;
  if (!model) return res.status(400).json({ error: 'model query param required' });

  const { send, finish } = initSSE(res);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  ensureModel(model, (event, data) => send(event, data))
    .then((ok) => {
      clearInterval(keepAlive);
      send('done', { success: ok, models: getAvailableModels() });
      finish();
    })
    .catch((err) => {
      clearInterval(keepAlive);
      send('done', { success: false, message: err.message });
      finish();
    });

  res.on('close', () => clearInterval(keepAlive));
});

// SSE: transcribe a local file by path
// Body: { filePath, model, language }
router.post('/transcribe/file', express.json(), async (req, res) => {
  const { filePath, model = 'base', language = 'auto' } = req.body || {};

  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: `File not found: ${filePath}` });
  if (!isWhisperReady()) return res.status(503).json({ error: 'whisper.cpp not installed. Open the Transcribe page to set it up.' });

  const { send, finish } = initSSE(res);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  try {
    const { text, outputTxt } = await transcribeFile(filePath, model, (event, data) => {
      send(event, data);
    }, { language });

    clearInterval(keepAlive);
    send('done', { success: true, text, outputTxt });
    finish();
  } catch (err) {
    clearInterval(keepAlive);
    send('done', { success: false, message: err.message });
    finish();
  }

  res.on('close', () => clearInterval(keepAlive));
});

// SSE: upload audio/video file and transcribe
// Multipart field: "file", optional fields: "model", "language"
router.post('/transcribe/upload', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a "file" field.' });
    }
    if (!isWhisperReady()) {
      fs.unlink(req.file.path, () => {});
      return res.status(503).json({ error: 'whisper.cpp not installed. Open the Transcribe page to set it up.' });
    }

    const model    = req.body.model    || 'base';
    const language = req.body.language || 'auto';

    // Rename the temp file to have a proper extension so ffmpeg can identify it
    const ext     = path.extname(req.file.originalname).toLowerCase() || '.mp4';
    const tmpPath = req.file.path + ext;
    fs.renameSync(req.file.path, tmpPath);

    const { send, finish } = initSSE(res);
    const keepAlive = setInterval(() => {
      if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 15000);

    try {
      const { text, outputTxt } = await transcribeFile(tmpPath, model, (event, data) => {
        send(event, data);
      }, { language });

      clearInterval(keepAlive);
      send('done', { success: true, text, outputTxt });
      finish();
    } catch (err) {
      clearInterval(keepAlive);
      send('done', { success: false, message: err.message });
      finish();
    } finally {
      // Clean up uploaded temp file
      try { fs.unlinkSync(tmpPath); } catch {}
      clearInterval(keepAlive);
    }

    res.on('close', () => clearInterval(keepAlive));
  });
});

module.exports = router;
