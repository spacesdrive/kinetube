/**
 * whisperManager.js
 *
 * Manages whisper.cpp on Windows:
 *  - Downloads the pre-built Windows binary (whisper-blas-bin-x64.zip from GitHub)
 *  - Downloads GGML model files from Hugging Face
 *  - Runs transcription via spawn, returning clean plain-text output
 *
 * Audio extraction (video → 16 kHz mono WAV) is done with the ffmpeg that is
 * already managed by ytdlpManager, so we import its path.
 */

'use strict';

const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { spawn } = require('child_process');
const unzipper  = require('unzipper');
const os        = require('os');

const { FFMPEG_EXE_PATH } = require('./ytdlpManager');

// ── Paths ─────────────────────────────────────────────────────────────────────

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');
const MODELS_DIR    = path.join(__dirname, '..', 'models');

[DOWNLOADS_DIR, MODELS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// whisper.cpp renames 'main.exe' to 'whisper-cli.exe' from v1.7 onwards.
// We check both after extraction.
const WHISPER_EXE_CANDIDATES = [
  path.join(DOWNLOADS_DIR, 'whisper-cli.exe'),
  path.join(DOWNLOADS_DIR, 'main.exe'),
];

const WHISPER_VERSION = '1.8.4';
const WHISPER_ZIP_URL =
  `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-blas-bin-x64.zip`;

// ── Model registry ────────────────────────────────────────────────────────────

const MODELS = {
  tiny:   { label: 'Tiny (~75 MB)',    file: 'ggml-tiny.bin',     sizeMB: 75   },
  base:   { label: 'Base (~142 MB)',   file: 'ggml-base.bin',     sizeMB: 142  },
  small:  { label: 'Small (~466 MB)',  file: 'ggml-small.bin',    sizeMB: 466  },
  medium: { label: 'Medium (~1.5 GB)', file: 'ggml-medium.bin',   sizeMB: 1500 },
  large:  { label: 'Large (~2.9 GB)',  file: 'ggml-large-v3.bin', sizeMB: 2900 },
};

const HF_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWhisperExe() {
  return WHISPER_EXE_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

function isWhisperReady()       { return getWhisperExe() !== null; }
function isModelReady(name)     { return fs.existsSync(getModelPath(name)); }
function getModelPath(name)     { return path.join(MODELS_DIR, MODELS[name]?.file || ''); }
function getAvailableModels()   {
  return Object.entries(MODELS).map(([key, m]) => ({
    key,
    label:   m.label,
    sizeMB:  m.sizeMB,
    ready:   fs.existsSync(path.join(MODELS_DIR, m.file)),
  }));
}

// ── Generic download with progress + redirect following ───────────────────────

function downloadFileWithProgress(url, dest, onProgress, maxRedirects = 12) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => { if (!settled) { settled = true; err ? reject(err) : resolve(); } };

    function go(currentUrl, left) {
      const mod = currentUrl.startsWith('https') ? https : http;
      const req = mod.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (left === 0) return done(new Error('Too many redirects'));
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, currentUrl).toString();
          return go(next, left - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return done(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
        }
        const total = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded = 0;
        const t0 = Date.now();
        const file = fs.createWriteStream(dest);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const speed = downloaded / ((Date.now() - t0) / 1000 || 0.001);
          onProgress?.({ downloaded, total, percent: total ? (downloaded / total) * 100 : 0, speed });
        });
        res.on('error', (err) => { file.destroy(); done(err); });
        file.on('error', done);
        file.on('finish', () => file.close(() => done()));
        res.pipe(file);
      });
      req.on('error', done);
    }
    go(url, maxRedirects);
  });
}

// ── Ensure whisper.cpp binary ─────────────────────────────────────────────────

async function ensureWhisper(onEvent) {
  if (isWhisperReady()) {
    onEvent?.('phase', { tool: 'whisper', phase: 'done', message: 'whisper already installed', skipped: true });
    return true;
  }

  const zipPath = path.join(DOWNLOADS_DIR, 'whisper-setup.zip');

  try {
    onEvent?.('phase', { tool: 'whisper', phase: 'downloading', message: 'Downloading whisper.cpp…' });

    await downloadFileWithProgress(WHISPER_ZIP_URL, zipPath, (p) => {
      onEvent?.('progress', { tool: 'whisper', ...p });
    });

    onEvent?.('phase', { tool: 'whisper', phase: 'extracting', message: 'Extracting whisper binary…' });

    // Extract all .exe and .dll files (the binary needs its DLLs)
    await new Promise((res, rej) => {
      const rs = fs.createReadStream(zipPath);
      rs.on('error', rej);
      rs.pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const name = path.basename(entry.path);
          if (/\.(exe|dll)$/i.test(name)) {
            entry.pipe(fs.createWriteStream(path.join(DOWNLOADS_DIR, name))).on('error', rej);
          } else {
            entry.autodrain();
          }
        })
        .on('finish', res)
        .on('error', rej);
    });

    try { fs.unlinkSync(zipPath); } catch {}

    if (!isWhisperReady()) throw new Error('whisper executable not found in zip');

    onEvent?.('phase', { tool: 'whisper', phase: 'done', message: 'whisper.cpp installed' });
    return true;
  } catch (err) {
    try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch {}
    onEvent?.('phase', { tool: 'whisper', phase: 'error', message: `Setup failed: ${err.message}` });
    return false;
  }
}

// ── Ensure a model file ───────────────────────────────────────────────────────

async function ensureModel(modelName, onEvent) {
  if (!MODELS[modelName]) {
    onEvent?.('phase', { tool: 'model', phase: 'error', message: `Unknown model: ${modelName}` });
    return false;
  }
  if (isModelReady(modelName)) {
    onEvent?.('phase', { tool: 'model', phase: 'done', message: `${modelName} model already downloaded`, skipped: true });
    return true;
  }

  const dest = getModelPath(modelName);
  const url  = `${HF_BASE}/${MODELS[modelName].file}`;

  try {
    onEvent?.('phase', { tool: 'model', phase: 'downloading', message: `Downloading ${modelName} model…`, model: modelName });

    await downloadFileWithProgress(url, dest, (p) => {
      onEvent?.('progress', { tool: 'model', model: modelName, ...p });
    });

    if (!fs.existsSync(dest) || fs.statSync(dest).size < 1_000_000) {
      fs.unlinkSync(dest);
      throw new Error('Downloaded model file is too small — download may have failed');
    }

    onEvent?.('phase', { tool: 'model', phase: 'done', message: `${modelName} model ready`, model: modelName });
    return true;
  } catch (err) {
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
    onEvent?.('phase', { tool: 'model', phase: 'error', message: `Model download failed: ${err.message}`, model: modelName });
    return false;
  }
}

// ── Audio extraction ──────────────────────────────────────────────────────────
// whisper.cpp requires: 16 kHz, mono, 16-bit PCM WAV

function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(FFMPEG_EXE_PATH)) {
      return reject(new Error('ffmpeg not found. Please ensure ffmpeg is installed via the setup screen.'));
    }
    const proc = spawn(FFMPEG_EXE_PATH, [
      '-i', inputPath,
      '-ar', '16000',   // 16 kHz
      '-ac', '1',       // mono
      '-c:a', 'pcm_s16le',
      '-y',             // overwrite
      outputPath,
    ], { windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
      resolve();
    });
    proc.on('error', reject);
  });
}

// ── Transcription ─────────────────────────────────────────────────────────────

const TIMESTAMP_RE = /\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g;

function cleanTranscription(raw) {
  return raw
    .replace(TIMESTAMP_RE, '')       // remove all [HH:MM:SS.mmm --> ...] markers
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')                        // collapse into flowing paragraphs
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Transcribe an audio or video file.
 *
 * @param {string} inputPath  — path to audio/video file
 * @param {string} modelName  — whisper model key ('tiny', 'base', …)
 * @param {function} onEvent  — progress callback (event, data)
 * @param {object}  opts      — { threads: number, language: string | 'auto' }
 * @returns {Promise<{ text, outputTxt }>}
 */
async function transcribeFile(inputPath, modelName = 'base', onEvent, opts = {}) {
  const whisperExe = getWhisperExe();
  if (!whisperExe) throw new Error('whisper.cpp not installed. Open the Transcribe page to install it.');
  if (!isModelReady(modelName)) throw new Error(`Model "${modelName}" is not downloaded yet.`);
  if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);

  const modelPath = getModelPath(modelName);
  const ext = path.extname(inputPath).toLowerCase();
  const isWav = ext === '.wav';

  // Temp WAV path for non-WAV inputs
  const tmpWav = isWav ? inputPath : path.join(os.tmpdir(), `kinetube-whisper-${Date.now()}.wav`);

  try {
    // ── Step 1: extract audio if needed ──────────────────────────────────────
    if (!isWav) {
      onEvent?.('phase', { phase: 'extracting', message: 'Extracting audio…' });
      await extractAudio(inputPath, tmpWav);
    }

    // ── Step 2: run whisper ───────────────────────────────────────────────────
    onEvent?.('phase', { phase: 'transcribing', message: 'Transcribing…' });

    const threads = opts.threads || Math.max(1, Math.floor(os.cpus().length / 2));
    const args = [
      '-m', modelPath,
      '-f', tmpWav,
      '-t', String(threads),
      '--no-timestamps',
    ];
    if (opts.language && opts.language !== 'auto') {
      args.push('-l', opts.language);
    }

    const rawText = await new Promise((resolve, reject) => {
      const proc = spawn(whisperExe, args, { windowsHide: true });
      let stdout = '', stderr = '';

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
        // Emit intermediate chunks so the UI can stream the result
        const chunk = d.toString().trim();
        if (chunk) onEvent?.('chunk', { text: chunk });
      });
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
        // whisper.cpp prints progress to stderr; parse percentage
        const m = d.toString().match(/(\d+)%/);
        if (m) onEvent?.('progress', { percent: parseInt(m[1], 10) });
      });

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('Transcription timed out after 30 minutes.'));
      }, 30 * 60 * 1000);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0 && !stdout.trim()) {
          return reject(new Error(`whisper exited with code ${code}.\n${stderr.slice(-500)}`));
        }
        resolve(stdout);
      });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    const text = cleanTranscription(rawText);

    // ── Step 3: save .txt alongside the original file ─────────────────────────
    const txtPath = inputPath.replace(/\.[^.]+$/, '') + '.txt';
    fs.writeFileSync(txtPath, text, 'utf8');

    onEvent?.('phase', { phase: 'done', message: 'Transcription complete' });
    return { text, outputTxt: txtPath };
  } finally {
    if (!isWav && fs.existsSync(tmpWav)) {
      try { fs.unlinkSync(tmpWav); } catch {}
    }
  }
}

module.exports = {
  isWhisperReady,
  isModelReady,
  getWhisperExe,
  getModelPath,
  getAvailableModels,
  ensureWhisper,
  ensureModel,
  transcribeFile,
  MODELS,
};
