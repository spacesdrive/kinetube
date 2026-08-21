
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawn, execSync } = require('child_process');
const unzipper = require('unzipper');

const { DOWNLOADS_DIR } = require('./paths');
const { downloadFileWithProgress } = require('./download');

const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux' | ...

// ── yt-dlp ────────────────────────────────────────────────────────────────────
// yt-dlp publishes a standalone binary per platform on the same GitHub release
// (yt-dlp.exe / yt-dlp_macos / yt-dlp_linux) - no archive extraction needed.

const YTDLP_VERSION = '2026.03.17';

const YTDLP_ASSET_BY_PLATFORM = {
  win32: 'yt-dlp.exe',
  darwin: 'yt-dlp_macos',
  linux: 'yt-dlp_linux',
};

function getYtdlpAssetName(platform) {
  const asset = YTDLP_ASSET_BY_PLATFORM[platform];
  if (!asset) throw new Error(`yt-dlp has no managed binary for platform "${platform}"`);
  return asset;
}

function getYtdlpBinaryName(platform) {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

function getYtdlpDownloadUrl(platform) {
  return `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${getYtdlpAssetName(platform)}`;
}

const YTDLP_BINARY_NAME = getYtdlpBinaryName(PLATFORM);
const YTDLP_EXE_PATH = path.join(DOWNLOADS_DIR, YTDLP_BINARY_NAME);
const YTDLP_URL = PLATFORM in YTDLP_ASSET_BY_PLATFORM ? getYtdlpDownloadUrl(PLATFORM) : null;

function getYtdlpPath() { return YTDLP_EXE_PATH; }

// ── ffmpeg ────────────────────────────────────────────────────────────────────
// Each platform gets its build from the community-standard static-build source
// (the same sources the popular `ffmpeg-static` npm package uses):
//   Windows      - gyan.dev "essentials" zip (bin/ffmpeg.exe inside)
//   macOS        - evermeet.cx's stable "latest release" zip redirect (x64;
//                  relies on Rosetta 2 to run on Apple Silicon - see DECISIONS.md)
//   Linux (x64)  - johnvansickle.com static tar.xz build

const FFMPEG_WINDOWS_ZIP_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
const FFMPEG_MACOS_ZIP_URL   = 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip';
const FFMPEG_LINUX_TARXZ_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';

function getFfmpegBinaryName(platform) {
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

// Pure, platform-keyed description of how to fetch ffmpeg - kept separate from
// I/O so the mapping itself is unit-testable without touching the filesystem.
function getFfmpegDownloadInfo(platform) {
  if (platform === 'win32') {
    return { archiveType: 'zip', url: FFMPEG_WINDOWS_ZIP_URL, matchEntry: (p) => /ffmpeg\.exe$/i.test(p) && /bin[/\\]/.test(p) };
  }
  if (platform === 'darwin') {
    return { archiveType: 'zip', url: FFMPEG_MACOS_ZIP_URL, matchEntry: (p) => path.basename(p) === 'ffmpeg' };
  }
  if (platform === 'linux') {
    return { archiveType: 'tar.xz', url: FFMPEG_LINUX_TARXZ_URL, matchEntry: null };
  }
  throw new Error(`ffmpeg has no managed static build for platform "${platform}"`);
}

const FFMPEG_BINARY_NAME = getFfmpegBinaryName(PLATFORM);
const FFMPEG_EXE_PATH = path.join(DOWNLOADS_DIR, FFMPEG_BINARY_NAME);

// ── ffmpeg extraction helpers ─────────────────────────────────────────────────

function extractFfmpegFromZip(zipPath, matchEntry) {
  return new Promise((resolve, reject) => {
    let found = false;
    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        if (matchEntry(entry.path)) {
          found = true;
          entry.pipe(fs.createWriteStream(FFMPEG_EXE_PATH)).on('error', reject);
        } else {
          entry.autodrain();
        }
      })
      .promise()
      .then(() => resolve(found))
      .catch(reject);
  });
}

function runTar(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', args);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => reject(new Error(
      `Could not run "tar" (${err.message}). ffmpeg's Linux static build ships as a .tar.xz archive - ` +
      'install tar and xz-utils (they ship with virtually every Linux distribution) and try again.'
    )));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`tar exited with code ${code}: ${stderr.slice(-300)}`));
      resolve();
    });
  });
}

function findFileRecursive(dir, filename) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
}

async function extractFfmpegFromTarXz(tarPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-ffmpeg-'));
  try {
    await runTar(['-xJf', tarPath, '-C', tempDir]);
    const extracted = findFileRecursive(tempDir, 'ffmpeg');
    if (!extracted) return false;
    fs.copyFileSync(extracted, FFMPEG_EXE_PATH);
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ── Setup orchestrator ───────────────────────────────────────────────────────
// onEvent(eventName, data) — emits 'phase' and 'progress' events.

async function setupToolsWithProgress(onEvent) {
  const status = checkYtdlpStatus();

  // ── yt-dlp ──────────────────────────────────────────────────────────────────
  if (!status.exists) {
    if (!YTDLP_URL) {
      onEvent('phase', { tool: 'ytdlp', phase: 'error', message: `yt-dlp has no managed binary for this platform (${PLATFORM}).` });
    } else {
      onEvent('phase', { tool: 'ytdlp', phase: 'downloading', message: `Downloading ${YTDLP_BINARY_NAME}...` });
      try {
        await downloadFileWithProgress(YTDLP_URL, YTDLP_EXE_PATH, (prog) => {
          onEvent('progress', { tool: 'ytdlp', ...prog });
        });
        if (PLATFORM !== 'win32') fs.chmodSync(YTDLP_EXE_PATH, 0o755);
        onEvent('phase', { tool: 'ytdlp', phase: 'done', message: `${YTDLP_BINARY_NAME} installed successfully` });
      } catch (err) {
        onEvent('phase', { tool: 'ytdlp', phase: 'error', message: `Download failed: ${err.message}` });
      }
    }
  } else {
    onEvent('phase', { tool: 'ytdlp', phase: 'done', message: `${YTDLP_BINARY_NAME} already installed`, skipped: true });
  }

  // ── ffmpeg ───────────────────────────────────────────────────────────────────
  if (!status.ffmpegAvailable) {
    let ffmpegInfo;
    try {
      ffmpegInfo = getFfmpegDownloadInfo(PLATFORM);
    } catch (err) {
      onEvent('phase', { tool: 'ffmpeg', phase: 'error', message: err.message });
      ffmpegInfo = null;
    }

    if (ffmpegInfo) {
      onEvent('phase', { tool: 'ffmpeg', phase: 'downloading', message: 'Downloading ffmpeg (this may take a moment)...' });
      const archivePath = path.join(DOWNLOADS_DIR, ffmpegInfo.archiveType === 'zip' ? 'ffmpeg-setup.zip' : 'ffmpeg-setup.tar.xz');

      try {
        await downloadFileWithProgress(ffmpegInfo.url, archivePath, (prog) => {
          onEvent('progress', { tool: 'ffmpeg', ...prog });
        });

        onEvent('phase', { tool: 'ffmpeg', phase: 'extracting', message: `Extracting ${FFMPEG_BINARY_NAME} from archive...` });

        const found = ffmpegInfo.archiveType === 'zip'
          ? await extractFfmpegFromZip(archivePath, ffmpegInfo.matchEntry)
          : await extractFfmpegFromTarXz(archivePath);

        try { fs.unlinkSync(archivePath); } catch {}

        if (!found) throw new Error(`${FFMPEG_BINARY_NAME} not found inside the downloaded archive`);
        if (PLATFORM !== 'win32') fs.chmodSync(FFMPEG_EXE_PATH, 0o755);

        onEvent('phase', { tool: 'ffmpeg', phase: 'done', message: `${FFMPEG_BINARY_NAME} installed successfully` });
      } catch (err) {
        try { if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath); } catch {}
        onEvent('phase', { tool: 'ffmpeg', phase: 'error', message: `Setup failed: ${err.message}` });
      }
    }
  } else {
    onEvent('phase', { tool: 'ffmpeg', phase: 'done', message: `${FFMPEG_BINARY_NAME} already installed`, skipped: true });
  }
}

// ── Legacy wrappers (used in server.js startup logging) ─────────────────────

async function ensureYtDlp() {
  if (!fs.existsSync(YTDLP_EXE_PATH)) {
    console.log(`${YTDLP_BINARY_NAME} not found — run the app in a browser to trigger setup.`);
    return false;
  }
  return true;
}

async function ensureFfmpeg() {
  if (!fs.existsSync(FFMPEG_EXE_PATH)) {
    console.log(`${FFMPEG_BINARY_NAME} not found — run the app in a browser to trigger setup.`);
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
      // Version-aware, not a plain inequality: a binary newer than
      // YTDLP_VERSION (e.g. updated via checkForYtdlpUpdate()/updateYtdlp()
      // below) is not "outdated" just because it no longer matches the
      // pinned constant - only actually older counts as needing an update.
      needsUpdate = isNewerYtdlpVersion(YTDLP_VERSION, currentVersion);
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

// ── Live update check (against GitHub, not the pinned YTDLP_VERSION) ────────
// checkYtdlpStatus()'s needsUpdate only compares the installed binary against
// YTDLP_VERSION - the version this copy of KineTube was built/tested against.
// That catches a binary that doesn't match what KineTube expects, but says
// nothing about whether yt-dlp has published something newer upstream since
// YTDLP_VERSION was last bumped in code. This checks GitHub directly instead.

const YTDLP_REPO = 'yt-dlp/yt-dlp';
const YTDLP_LATEST_RELEASE_API = `https://api.github.com/repos/${YTDLP_REPO}/releases/latest`;

// Pure, unit-testable: yt-dlp tags are calendar versions like "2026.03.17",
// occasionally with a patch suffix ("2026.03.17.1"). Compares numerically
// part-by-part so "2026.3.9" correctly sorts below "2026.3.10" - a plain
// string comparison would get that backwards.
function isNewerYtdlpVersion(latest, current) {
  if (!latest || !current) return false;
  const a = latest.trim().split(/[.\-]/).map(Number);
  const b = current.trim().split(/[.\-]/).map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] || 0, bv = b[i] || 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

// Resolves the latest published yt-dlp tag, or null on any failure (bad
// network, GitHub rate-limiting, unexpected response shape). Never rejects -
// this is a best-effort background check, not something that should ever
// turn into a crashed route or an unhandled rejection.
function fetchLatestYtdlpTag(timeoutMs = 8000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };

    const req = https.get(
      YTDLP_LATEST_RELEASE_API,
      { headers: { 'User-Agent': 'KineTube' } },
      (res) => {
        if (res.statusCode !== 200) { res.resume(); return finish(null); }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try { finish(JSON.parse(body).tag_name || null); }
          catch { finish(null); }
        });
        res.on('error', () => finish(null));
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy());
    req.on('error', () => finish(null));
  });
}

// Live check surfaced by GET /api/ytdlp-update-check. `checked: false` means
// the check itself couldn't complete (not installed yet, or GitHub
// unreachable) - the caller should treat that as "unknown", not "up to date".
async function checkForYtdlpUpdate() {
  const status = checkYtdlpStatus();
  if (!status.exists || !status.currentVersion) {
    return { checked: false, error: 'yt-dlp is not installed yet.' };
  }
  const latest = await fetchLatestYtdlpTag();
  if (!latest) {
    return { checked: false, error: 'Could not reach GitHub to check for a newer yt-dlp release.' };
  }
  return {
    checked: true,
    currentVersion: status.currentVersion,
    latestVersion: latest,
    updateAvailable: isNewerYtdlpVersion(latest, status.currentVersion),
    releaseUrl: `https://github.com/${YTDLP_REPO}/releases/tag/${latest}`,
  };
}

// Downloads the latest published yt-dlp binary for this platform in place
// over the current one. Unlike setupToolsWithProgress (which skips a tool
// that already exists), this always re-downloads - only call it after
// checkForYtdlpUpdate() has confirmed a newer version is actually available.
async function updateYtdlp(onProgress) {
  const latest = await fetchLatestYtdlpTag();
  if (!latest) throw new Error('Could not reach GitHub to fetch the latest yt-dlp release.');
  const url = `https://github.com/${YTDLP_REPO}/releases/download/${latest}/${getYtdlpAssetName(PLATFORM)}`;
  await downloadFileWithProgress(url, YTDLP_EXE_PATH, onProgress);
  if (PLATFORM !== 'win32') fs.chmodSync(YTDLP_EXE_PATH, 0o755);
  return latest;
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
  checkForYtdlpUpdate,
  updateYtdlp,
  // Exported for platform-resolution unit tests (see docs/workflows/TESTING.md):
  getYtdlpAssetName,
  getYtdlpBinaryName,
  getYtdlpDownloadUrl,
  getFfmpegBinaryName,
  getFfmpegDownloadInfo,
  isNewerYtdlpVersion,
};
