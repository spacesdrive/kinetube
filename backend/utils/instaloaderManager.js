/**
 * instaloaderManager.js
 *
 * Manages:
 *  - Downloading / verifying instaloader.exe (extracted from the Windows standalone zip)
 *  - Saving and loading Instagram session files (one per account)
 *  - An in-memory registry of active login processes (for 2FA code injection)
 */

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const unzipper = require('unzipper');

const { DOWNLOADS_DIR, SESSIONS_DIR } = require('./paths');

const INSTALOADER_EXE     = path.join(DOWNLOADS_DIR, 'instaloader.exe');
const ACCOUNTS_FILE       = path.join(SESSIONS_DIR,  'accounts.json');

const INSTALOADER_VERSION = '4.15.1';
const INSTALOADER_ZIP_URL =
  `https://github.com/instaloader/instaloader/releases/download/v${INSTALOADER_VERSION}/instaloader-v${INSTALOADER_VERSION}-windows-standalone.zip`;

// ── Download helper ───────────────────────────────────────────────────────────

function downloadFileWithProgress(url, dest, onProgress, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err); else resolve();
    };

    function go(currentUrl, redirectsLeft) {
      const req = https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); // drain so the socket can be reused
          if (redirectsLeft === 0) return done(new Error('Too many redirects'));
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, currentUrl).toString();
          return go(next, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return done(new Error(`HTTP ${res.statusCode} downloading instaloader`));
        }
        const total     = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded  = 0;
        const startTime = Date.now();
        const file      = fs.createWriteStream(dest);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const speed = downloaded / ((Date.now() - startTime) / 1000 || 0.001);
          if (onProgress) onProgress({ downloaded, total, percent: total ? (downloaded / total) * 100 : 0, speed });
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

// ── Public API ───────────────────────────────────────────────────────────────

function getInstaloaderPath() { return INSTALOADER_EXE; }
function isInstaloaderReady() { return fs.existsSync(INSTALOADER_EXE); }
function getSessionPath(username) { return path.join(SESSIONS_DIR, `session-${username}`); }

/** Download and extract instaloader.exe from the Windows standalone zip. */
async function ensureInstaloader(onEvent) {
  if (fs.existsSync(INSTALOADER_EXE)) {
    onEvent?.('phase', { tool: 'instaloader', phase: 'done', message: 'instaloader.exe already installed', skipped: true });
    return true;
  }

  onEvent?.('phase', { tool: 'instaloader', phase: 'downloading', message: 'Downloading instaloader...' });
  const zipPath = path.join(DOWNLOADS_DIR, 'instaloader-setup.zip');

  try {
    await downloadFileWithProgress(INSTALOADER_ZIP_URL, zipPath, (prog) => {
      onEvent?.('progress', { tool: 'instaloader', ...prog });
    });

    onEvent?.('phase', { tool: 'instaloader', phase: 'extracting', message: 'Extracting instaloader.exe...' });

    let found = false;
    await new Promise((res, rej) => {
      const readStream = fs.createReadStream(zipPath);
      readStream.on('error', rej);
      readStream
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          if (/instaloader\.exe$/i.test(entry.path)) {
            found = true;
            entry.pipe(fs.createWriteStream(INSTALOADER_EXE)).on('error', rej);
          } else {
            entry.autodrain();
          }
        })
        .on('finish', res)
        .on('error', rej);
    });

    try { fs.unlinkSync(zipPath); } catch {}

    if (!found || !fs.existsSync(INSTALOADER_EXE)) {
      throw new Error('instaloader.exe not found inside the zip');
    }

    onEvent?.('phase', { tool: 'instaloader', phase: 'done', message: 'instaloader.exe installed successfully' });
    return true;
  } catch (err) {
    try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch {}
    onEvent?.('phase', { tool: 'instaloader', phase: 'error', message: `Setup failed: ${err.message}` });
    return false;
  }
}

// ── Account / session management ─────────────────────────────────────────────

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

function getAccounts() {
  return loadAccounts().map((a) => ({
    ...a,
    sessionExists: fs.existsSync(getSessionPath(a.username)),
  }));
}

function addAccount(username) {
  const accounts = loadAccounts();
  if (!accounts.find((a) => a.username === username)) {
    accounts.push({ username, addedAt: new Date().toISOString() });
    saveAccounts(accounts);
  }
}

function removeAccount(username) {
  const accounts = loadAccounts().filter((a) => a.username !== username);
  saveAccounts(accounts);
  const sessionPath = getSessionPath(username);
  try { if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath); } catch {}
}

// ── Active login process registry (for 2FA code injection) ───────────────────
// key: username, value: { proc, resolve, reject }
const activeLogins = new Map();

function registerLoginProc(username, proc, resolve, reject) {
  activeLogins.set(username, { proc, resolve, reject });
}

function getActiveLogin(username) { return activeLogins.get(username) || null; }
function clearActiveLogin(username) { activeLogins.delete(username); }

module.exports = {
  getInstaloaderPath,
  isInstaloaderReady,
  getSessionPath,
  ensureInstaloader,
  getAccounts,
  addAccount,
  removeAccount,
  registerLoginProc,
  getActiveLogin,
  clearActiveLogin,
  SESSIONS_DIR,
  INSTALOADER_VERSION,
};
