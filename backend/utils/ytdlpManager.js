
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const unzipper = require('unzipper');

const FFMPEG_EXE_PATH = path.join(__dirname, '..', 'downloads', 'ffmpeg.exe');
const YTDLP_EXE_PATH  = path.join(__dirname, '..', 'downloads', 'yt-dlp.exe');
const DOWNLOADS_DIR   = path.join(__dirname, '..', 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

function getYtdlpPath() { return YTDLP_EXE_PATH; }

const YTDLP_VERSION  = '2026.03.17';
const YTDLP_URL      = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp.exe`;
const FFMPEG_ZIP_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

// ── Basic download (no progress) — kept for backwards compat ────────────────

function downloadFile(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function requestUrl(currentUrl, redirectsLeft) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          if (redirectsLeft === 0) { reject(new Error(`Too many redirects for ${url}`)); return; }
          const loc = response.headers.location.startsWith('http')
            ? response.headers.location
            : new URL(response.headers.location, currentUrl).toString();
          requestUrl(loc, redirectsLeft - 1);
        } else if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest);
          response.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', reject);
        } else {
          reject(new Error(`HTTP ${response.statusCode} for ${currentUrl}`));
        }
      }).on('error', (err) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
    }
    requestUrl(url, maxRedirects);
  });
}

// ── Progress-aware download ──────────────────────────────────────────────────
// onProgress({ downloaded, total, percent, speed })

function downloadFileWithProgress(url, dest, onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function requestUrl(currentUrl, redirectsLeft) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          if (redirectsLeft === 0) { reject(new Error('Too many redirects')); return; }
          const loc = response.headers.location.startsWith('http')
            ? response.headers.location
            : new URL(response.headers.location, currentUrl).toString();
          requestUrl(loc, redirectsLeft - 1);
        } else if (response.statusCode === 200) {
          const total      = parseInt(response.headers['content-length'], 10) || 0;
          let downloaded   = 0;
          const startTime  = Date.now();

          const file = fs.createWriteStream(dest);

          response.on('data', (chunk) => {
            downloaded += chunk.length;
            const elapsedSec = (Date.now() - startTime) / 1000 || 0.001;
            const speed      = downloaded / elapsedSec; // bytes/s
            if (onProgress) {
              onProgress({
                downloaded,
                total,
                percent: total > 0 ? (downloaded / total) * 100 : 0,
                speed,
              });
            }
          });

          response.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', reject);
        } else {
          reject(new Error(`HTTP ${response.statusCode} for ${currentUrl}`));
        }
      }).on('error', (err) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
    }
    requestUrl(url, maxRedirects);
  });
}

// ── Setup orchestrator ───────────────────────────────────────────────────────
// onEvent(eventName, data) — emits 'phase' and 'progress' events.

async function setupToolsWithProgress(onEvent) {
  const status = checkYtdlpStatus();

  // ── yt-dlp ──────────────────────────────────────────────────────────────────
  if (!status.exists) {
    onEvent('phase', { tool: 'ytdlp', phase: 'downloading', message: 'Downloading yt-dlp.exe...' });
    try {
      await downloadFileWithProgress(YTDLP_URL, YTDLP_EXE_PATH, (prog) => {
        onEvent('progress', { tool: 'ytdlp', ...prog });
      });
      onEvent('phase', { tool: 'ytdlp', phase: 'done', message: 'yt-dlp.exe installed successfully' });
    } catch (err) {
      onEvent('phase', { tool: 'ytdlp', phase: 'error', message: `Download failed: ${err.message}` });
    }
  } else {
    onEvent('phase', { tool: 'ytdlp', phase: 'done', message: 'yt-dlp.exe already installed', skipped: true });
  }

  // ── ffmpeg ───────────────────────────────────────────────────────────────────
  if (!status.ffmpegAvailable) {
    onEvent('phase', { tool: 'ffmpeg', phase: 'downloading', message: 'Downloading ffmpeg (this may take a moment)...' });
    const zipPath = path.join(DOWNLOADS_DIR, 'ffmpeg-setup.zip');
    try {
      await downloadFileWithProgress(FFMPEG_ZIP_URL, zipPath, (prog) => {
        onEvent('progress', { tool: 'ffmpeg', ...prog });
      });

      onEvent('phase', { tool: 'ffmpeg', phase: 'extracting', message: 'Extracting ffmpeg.exe from archive...' });

      let found = false;
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          if (/ffmpeg\.exe$/i.test(fileName) && /bin[/\\]/.test(fileName)) {
            entry.pipe(fs.createWriteStream(FFMPEG_EXE_PATH));
            found = true;
          } else {
            entry.autodrain();
          }
        })
        .promise();

      try { fs.unlinkSync(zipPath); } catch {}

      if (!found) throw new Error('ffmpeg.exe not found inside the downloaded zip');

      onEvent('phase', { tool: 'ffmpeg', phase: 'done', message: 'ffmpeg.exe installed successfully' });
    } catch (err) {
      try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch {}
      onEvent('phase', { tool: 'ffmpeg', phase: 'error', message: `Setup failed: ${err.message}` });
    }
  } else {
    onEvent('phase', { tool: 'ffmpeg', phase: 'done', message: 'ffmpeg.exe already installed', skipped: true });
  }
}

// ── Legacy wrappers (used in server.js startup logging) ─────────────────────

async function ensureYtDlp() {
  if (!fs.existsSync(YTDLP_EXE_PATH)) {
    console.log('yt-dlp.exe not found — run the app in a browser to trigger setup.');
    return false;
  }
  return true;
}

async function ensureFfmpeg() {
  if (!fs.existsSync(FFMPEG_EXE_PATH)) {
    console.log('ffmpeg.exe not found — run the app in a browser to trigger setup.');
    return false;
  }
  return true;
}

// ── Status check ─────────────────────────────────────────────────────────────

function checkYtdlpStatus() {
  const exists         = fs.existsSync(YTDLP_EXE_PATH);
  const ffmpegAvailable = fs.existsSync(FFMPEG_EXE_PATH);
  let currentVersion   = null;
  let needsUpdate      = false;
  if (exists) {
    try {
      currentVersion = execSync(`"${YTDLP_EXE_PATH}" --version`, { encoding: 'utf8' }).trim();
      const normCurrent  = currentVersion.toLowerCase().split(/[\s\-+]/)[0];
      const normRequired = YTDLP_VERSION.toLowerCase().split(/[\s\-+]/)[0];
      needsUpdate = normCurrent !== normRequired;
    } catch {}
  }
  return {
    exists,
    currentVersion,
    needsUpdate,
    isUpToDate:      exists && !needsUpdate,
    requiredVersion: YTDLP_VERSION,
    path:            YTDLP_EXE_PATH,
    downloadUrl:     YTDLP_URL,
    ffmpegAvailable,
  };
}

module.exports = {
  ensureYtDlp,
  ensureFfmpeg,
  setupToolsWithProgress,
  FFMPEG_EXE_PATH,
  YTDLP_EXE_PATH,
  DOWNLOADS_DIR,
  checkYtdlpStatus,
  getYtdlpPath,
};
