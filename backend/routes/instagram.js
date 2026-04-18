/**
 * Instagram API routes
 *
 * POST /api/instagram/info           — fetch reel/post/profile metadata
 * GET  /api/instagram/download       — SSE: download single post/reel
 * GET  /api/instagram/bulk-download  — SSE: download multiple posts
 * GET  /api/instagram/accounts       — list saved accounts
 * POST /api/instagram/login          — start login (spawns instaloader, handles 2FA state)
 * POST /api/instagram/login/2fa      — inject 2FA code into waiting login process
 * DELETE /api/instagram/accounts/:u — remove account + session
 * GET  /api/instagram/setup          — SSE: download instaloader.exe
 * GET  /api/instagram/setup/check    — JSON: is instaloader ready?
 */

const express = require('express');
const router = express.Router();
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Python helper detection ───────────────────────────────────────────────────
// We prefer Python + instaloader library over the CLI exe because the library
// handles authentication far more reliably (no stdin/tty issues).

const LOGIN_HELPER = path.join(__dirname, '..', 'utils', 'instaloader_login.py');
const PROFILE_HELPER = path.join(__dirname, '..', 'utils', 'instaloader_profile.py');

let _pythonCmd = null; // cached after first detection

async function detectPython() {
  if (_pythonCmd) return _pythonCmd;
  const candidates = ['python', 'python3'];
  for (const cmd of candidates) {
    try {
      await new Promise((resolve, reject) => {
        execFile(cmd, ['-c', 'import instaloader; print("ok")'], { timeout: 8000 }, (err, stdout) => {
          if (!err && stdout.trim() === 'ok') resolve();
          else reject();
        });
      });
      _pythonCmd = cmd;
      return cmd;
    } catch { }
  }
  return null;
}

// Check Python availability and instaloader separately (for setup UI)
async function checkPythonSetup() {
  let pythonCmd = null;
  for (const cmd of ['python', 'python3']) {
    try {
      await new Promise((resolve, reject) => {
        execFile(cmd, ['--version'], { timeout: 5000 }, (err) => err ? reject() : resolve());
      });
      pythonCmd = cmd;
      break;
    } catch { }
  }
  if (!pythonCmd) return { pythonFound: false, instaloaderReady: false };

  const instaloaderReady = await new Promise((resolve) => {
    execFile(pythonCmd, ['-c', 'import instaloader; print("ok")'], { timeout: 8000 }, (err, stdout) => {
      resolve(!err && stdout.trim() === 'ok');
    });
  });
  return { pythonFound: true, pythonCmd, instaloaderReady };
}

const { parseInstagramUrl } = require('../utils/instagramUrlParser');
const {
  getInstaloaderPath, isInstaloaderReady, getSessionPath,
  ensureInstaloader, getAccounts, addAccount, removeAccount,
  registerLoginProc, getActiveLogin, clearActiveLogin,
} = require('../utils/instaloaderManager');
const { YTDLP_EXE_PATH, FFMPEG_EXE_PATH } = require('../utils/ytdlpManager');

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

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
  const finish = () => {
    if (!res.writableEnded) { res.write('retry: 3600000\n\n'); res.end(); }
  };
  return { send, finish };
}

// ── Instaloader output parsers ────────────────────────────────────────────────

// tqdm progress: " 45%|████▌     | 11.5M/25.5M [00:03<00:04, 2.87MB/s]"
const TQDM_RE = /(\d+)%\|[^|]*\|\s*([\d.]+)([KMGkmg]?)B?\/([\d.]+)([KMGkmg]?)B?\s+\[([^<]+)<([^,\]]+),?\s*([^\]]*)\]/;

const UNITS = { k: 1e3, m: 1e6, g: 1e9, K: 1e3, M: 1e6, G: 1e9 };
function toBytes(val, unit) { return parseFloat(val) * (UNITS[unit] || 1); }

function parseTqdm(line) {
  const m = line.match(TQDM_RE);
  if (!m) return null;
  return {
    percent: parseFloat(m[1]),
    downloaded: toBytes(m[2], m[3]),
    total: toBytes(m[4], m[5]),
    eta: m[7].trim(),
    speed: m[8].trim(),
  };
}

// ── Setup: download instaloader.exe ──────────────────────────────────────────

router.get('/instagram/setup/check', (req, res) => {
  res.json({ ready: isInstaloaderReady() });
});

// Check Python + instaloader availability (for login modal setup UI)
router.get('/instagram/setup/python/check', async (req, res) => {
  const result = await checkPythonSetup();
  res.json(result);
});

// SSE: auto-install instaloader via pip
router.get('/instagram/setup/instaloader', async (req, res) => {
  const { send, finish } = initSSE(res);

  const setup = await checkPythonSetup();
  if (!setup.pythonFound) {
    send('done', { success: false, message: 'Python not found. Install Python from python.org first, then try again.' });
    return finish();
  }
  if (setup.instaloaderReady) {
    _pythonCmd = setup.pythonCmd;
    send('done', { success: true, message: 'instaloader is already installed.' });
    return finish();
  }

  send('log', { line: `Found Python: ${setup.pythonCmd}` });
  send('log', { line: 'Running: pip install instaloader...' });

  const proc = spawn(setup.pythonCmd, ['-m', 'pip', 'install', 'instaloader'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const onLine = (line) => { if (line.trim()) send('log', { line: line.trim() }); };

  proc.stdout.on('data', (d) => d.toString().split('\n').forEach(onLine));
  proc.stderr.on('data', (d) => d.toString().split('\n').forEach(onLine));

  proc.on('close', (code) => {
    _pythonCmd = null; // clear cache so detectPython() re-checks
    if (code === 0) {
      send('done', { success: true, message: 'instaloader installed successfully.' });
    } else {
      send('done', { success: false, message: 'pip install failed. Try running: pip install instaloader in a terminal.' });
    }
    finish();
  });

  proc.on('error', (err) => {
    send('done', { success: false, message: `Could not run pip: ${err.message}` });
    finish();
  });

  res.on('close', () => { if (proc.exitCode === null) proc.kill(); });
});

router.get('/instagram/setup', (req, res) => {
  const { send, finish } = initSSE(res);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) { res.write(': keepalive\n\n'); if (typeof res.flush === 'function') res.flush(); }
  }, 15000);

  ensureInstaloader((event, data) => send(event, data))
    .then(() => { clearInterval(keepAlive); send('done', { success: true }); finish(); })
    .catch((err) => { clearInterval(keepAlive); send('done', { success: false, message: err.message }); finish(); });

  res.on('close', () => clearInterval(keepAlive));
});

// ── Account management ────────────────────────────────────────────────────────

router.get('/instagram/accounts', (req, res) => {
  res.json(getAccounts());
});

router.delete('/instagram/accounts/:username', (req, res) => {
  removeAccount(req.params.username);
  res.json({ ok: true });
});

// ── Login + 2FA ───────────────────────────────────────────────────────────────
//
// Flow:
//  1. POST /api/instagram/login { username, password }
//     → spawns: instaloader --login USERNAME --sessionfile PATH
//     → writes password to stdin
//     → if 2FA needed: returns { status: 'twofa_required' }
//     → if success: returns { status: 'success' }
//     → if error:   returns { status: 'error', message }
//
//  2. POST /api/instagram/login/2fa { username, code }
//     → finds the waiting instaloader proc in memory
//     → writes code to stdin
//     → waits for result
//
// instaloader prompts (on stderr / combined):
//   Password prompt   : "Enter password for @USERNAME:" | "Password:"
//   2FA prompt        : "Two-factor authentication" | "Please enter the code"
//   Success           : "Logged in as" | "Saved session"
//   Wrong password    : "Bad credentials" | "wrong password"
//   Checkpoint        : "checkpoint" (Instagram suspicious login block)

router.post('/instagram/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password are required.' });
  }

  // ── Try Python + instaloader library first (most reliable) ────────────────
  const pythonCmd = await detectPython();

  if (pythonCmd) {
    return loginWithPython(pythonCmd, username, password, res);
  }

  // ── Python not available — inform user ────────────────────────────────────
  return res.status(503).json({
    status: 'error',
    message:
      'Python + instaloader library not found on this machine. ' +
      'To log in, install Python (python.org) and run: pip install instaloader. ' +
      'Then use the "Import session file" option below — run the provided login.py script, ' +
      'then import the generated session-USERNAME file.',
  });
});

// ── Python-based login (uses instaloader Python API) ──────────────────────────

function loginWithPython(pythonCmd, username, password, res) {
  const { SESSIONS_DIR } = require('../utils/instaloaderManager');

  const proc = spawn(pythonCmd, [LOGIN_HELPER], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });

  let initialDone = false; // true once we've sent the first HTTP response
  let outBuf = '';

  proc.stdin.write(JSON.stringify({ username, password, sessions_dir: SESSIONS_DIR }) + '\n');

  const timeout = setTimeout(() => {
    if (!initialDone) {
      initialDone = true;
      proc.kill();
      clearActiveLogin(username);
      res.json({ status: 'error', message: 'Login timed out after 45 seconds. Try again in a few minutes.' });
    }
  }, 45000);

  proc.stdout.on('data', (chunk) => {
    outBuf += chunk.toString();
    const lines = outBuf.split('\n');
    outBuf = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || initialDone) continue;
      let msg;
      try { msg = JSON.parse(trimmed); } catch { continue; }

      initialDone = true;
      clearTimeout(timeout);

      if (msg.status === 'success') {
        addAccount(username);
        clearActiveLogin(username);
        res.json({ status: 'success', message: `Logged in as @${username}.` });
      } else if (msg.status === 'twofa_required') {
        // Keep proc alive — register WITHOUT calling clearActiveLogin
        registerLoginProc(username, proc, null, null);
        res.json({ status: 'twofa_required', message: 'Two-factor authentication required.' });
      } else {
        clearActiveLogin(username);
        res.json({ status: 'error', message: msg.message || 'Login failed.' });
      }
    }
  });

  proc.stderr.on('data', () => { });

  proc.on('close', (code) => {
    clearTimeout(timeout);
    clearActiveLogin(username);
    if (!initialDone) {
      initialDone = true;
      if (code === 0) { addAccount(username); res.json({ status: 'success', message: `Logged in as @${username}.` }); }
      else res.json({ status: 'error', message: 'Login process ended unexpectedly. Check your credentials and try again.' });
    }
  });

  proc.on('error', (err) => {
    clearTimeout(timeout);
    clearActiveLogin(username);
    if (!initialDone) {
      initialDone = true;
      res.json({ status: 'error', message: `Could not start Python: ${err.message}` });
    }
  });
}

router.post('/instagram/login/2fa', (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ status: 'error', message: 'Username and code are required.' });

  const session = getActiveLogin(username);
  if (!session) {
    return res.status(404).json({ status: 'error', message: 'No active login session found. Please start login again.' });
  }

  const { proc, resolve: finish } = session;

  // Python helper reads a JSON line for the 2FA code
  try {
    proc.stdin.write(JSON.stringify({ code }) + '\n');
  } catch (e) {
    clearActiveLogin(username);
    return res.json({ status: 'error', message: 'Failed to send 2FA code to login process.' });
  }

  // The Python helper writes one JSON line back — listen for it
  let outBuf = '';
  let answered = false;

  const onData = (chunk) => {
    if (answered) return;
    outBuf += chunk.toString();
    const lines = outBuf.split('\n');
    outBuf = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg;
      try { msg = JSON.parse(trimmed); } catch { continue; }
      answered = true;
      clearActiveLogin(username);
      if (msg.status === 'success') {
        addAccount(username);
        res.json({ status: 'success', message: `Logged in as @${username}.` });
      } else {
        res.json({ status: 'error', message: msg.message || 'Invalid 2FA code.' });
      }
    }
  };

  proc.stdout.on('data', onData);

  proc.on('close', (code) => {
    if (answered) return;
    clearActiveLogin(username);
    if (code === 0) { addAccount(username); res.json({ status: 'success', message: `Logged in as @${username}.` }); }
    else res.json({ status: 'error', message: '2FA verification failed.' });
  });
});

// ── Session file import (for users who ran login.py manually) ─────────────────
// POST /api/instagram/session/import  { username, sessionFilePath }
// Copies the session file produced by the user's login.py into the sessions dir.

router.post('/instagram/session/import', express.json(), async (req, res) => {
  const { username, sessionFilePath } = req.body || {};
  if (!username || !sessionFilePath) {
    return res.status(400).json({ status: 'error', message: 'username and sessionFilePath are required.' });
  }
  if (!fs.existsSync(sessionFilePath)) {
    return res.status(404).json({ status: 'error', message: `File not found: ${sessionFilePath}` });
  }
  try {
    const { getSessionPath } = require('../utils/instaloaderManager');
    const dest = getSessionPath(username);
    fs.copyFileSync(sessionFilePath, dest);
    addAccount(username);
    res.json({ status: 'success', message: `Session imported for @${username}.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: `Import failed: ${err.message}` });
  }
});

// ── Info: fetch post/reel/profile metadata ────────────────────────────────────

router.post('/instagram/info', async (req, res) => {
  const { url, account } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  const parsed = parseInstagramUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Invalid Instagram URL. Paste a reel, post, profile, or story link.' });

  const isProfile = ['profile', 'profile_reels', 'profile_tagged'].includes(parsed.type);

  if (isProfile) {
    return fetchProfileInfo(parsed, account, res);
  } else {
    return fetchSingleInfo(parsed, account, res);
  }
});

// ── SSE: streaming info fetch (used by single-URL mode for live progress) ─────
// GET /api/instagram/info-stream?url=...&account=...
//
// Events:
//   profile  { channelName, username, mediacount, avatar, ... }  — emitted immediately for profiles
//   progress { fetched, total }                                   — emitted per post during scrape
//   done     { ok: true, data: {...} }  |  { ok: false, error }

router.get('/instagram/info-stream', async (req, res) => {
  const { url, account } = req.query;
  const { send, finish } = initSSE(res);

  if (!url) { send('done', { ok: false, error: 'URL is required.' }); return finish(); }

  const parsed = parseInstagramUrl(url);
  if (!parsed) { send('done', { ok: false, error: 'Invalid Instagram URL.' }); return finish(); }

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) { res.write(': keepalive\n\n'); if (typeof res.flush === 'function') res.flush(); }
  }, 15000);
  res.on('close', () => clearInterval(keepAlive));

  const isProfile = ['profile', 'profile_reels', 'profile_tagged'].includes(parsed.type);

  if (isProfile) {
    await streamProfileInfo(parsed, account, send, finish, keepAlive, res);
  } else {
    await streamSingleInfo(parsed, account, send, finish);
    clearInterval(keepAlive);
  }
});

// ── Error classification helpers ─────────────────────────────────────────────

function classifyYtdlpError(stderr) {
  const s = (stderr || '').toLowerCase();
  if (s.includes('private') || s.includes('login required') || s.includes('not available'))
    return { code: 'private', hint: 'This content is private or requires login. Add an Instagram account in the Instagram tab.' };
  if (s.includes('429') || s.includes('rate') || s.includes('too many'))
    return { code: 'ratelimit', hint: 'Instagram is rate-limiting requests. Wait a few minutes and try again.' };
  if (s.includes('removed') || s.includes('deleted') || s.includes('no longer available'))
    return { code: 'deleted', hint: 'This post appears to have been deleted or is no longer available.' };
  if (s.includes('geo') || s.includes('not available in your country'))
    return { code: 'geo', hint: 'This content is not available in your region.' };
  if (s.includes('age') || s.includes('18+') || s.includes('age-restricted'))
    return { code: 'age', hint: 'Age-restricted content. You must be logged in to download this.' };
  if (s.includes('captcha') || s.includes('challenge'))
    return { code: 'captcha', hint: 'Instagram triggered a bot-protection challenge. Try again later or use an account.' };
  return { code: 'unknown', hint: 'Could not fetch this content. Instagram may be temporarily unavailable.' };
}

// Runs yt-dlp and retries once after a 4-second delay if rate-limited.
function spawnYtdlpWithRetry(args, timeout = 30000) {
  const run = () => new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_EXE_PATH, args, { windowsHide: true });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Metadata fetch timed out.')); }, timeout);

    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.stderr.on('data', (d) => stderr += d.toString());
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });

  return run().then(async (result) => {
    const err = classifyYtdlpError(result.stderr);
    if (result.code !== 0 && err.code === 'ratelimit') {
      // Single retry after a brief pause
      await new Promise((r) => setTimeout(r, 4000));
      return run();
    }
    return result;
  });
}

async function fetchSingleInfo(parsed, account, res) {
  const sessionPath = account ? getSessionPath(account) : null;
  const hasSession = sessionPath && fs.existsSync(sessionPath);

  const ytdlpArgs = ['-J', '--no-warnings', '--no-check-certificates', parsed.cleanUrl];
  if (hasSession) ytdlpArgs.push('--cookies', sessionPath);
  if (fs.existsSync(FFMPEG_EXE_PATH)) ytdlpArgs.push('--ffmpeg-location', DOWNLOADS_DIR);

  let result;
  try {
    result = await spawnYtdlpWithRetry(ytdlpArgs, 30000);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { code, stdout, stderr } = result;

  if (code !== 0 || !stdout.trim()) {
    const { hint } = classifyYtdlpError(stderr);
    const rawDetail = stderr.trim().split('\n').filter((l) => l.startsWith('[ERROR]') || (!l.startsWith('[') && l.trim())).slice(-2).join(' ').trim();
    return res.status(502).json({
      error: 'Could not fetch this content.',
      hint,
      detail: rawDetail || undefined,
    });
  }

  let data;
  try { data = JSON.parse(stdout); } catch {
    return res.status(500).json({ error: 'Failed to parse metadata.' });
  }

  res.json({
    type: parsed.type,
    cleanUrl: parsed.cleanUrl,
    shortcode: parsed.shortcode,
    id: data.id,
    title: data.title || data.description || 'Untitled',
    description: (data.description || data.title || '').slice(0, 300),
    thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[data.thumbnails.length - 1]?.url) || null,
    width: data.width || null,
    height: data.height || null,
    duration: data.duration,
    durationString: data.duration_string,
    viewCount: data.view_count,
    likeCount: data.like_count,
    commentCount: data.comment_count,
    uploader: data.uploader || data.channel,
    uploadDate: data.upload_date,
    formats: buildFormats(data.formats || []),
  });
}

function buildFormats(formats) {
  // Instagram videos are typically a single combined stream
  const seen = new Set();
  const result = [];
  for (const f of formats) {
    if (f.vcodec && f.vcodec !== 'none' && f.height) {
      const key = f.height;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ height: f.height, label: `${f.height}p`, ext: f.ext, filesize: f.filesize });
      }
    }
  }
  return result.sort((a, b) => b.height - a.height);
}

// ── SSE stream helpers ────────────────────────────────────────────────────────

// Single post/reel via yt-dlp, result sent as SSE done event
async function streamSingleInfo(parsed, account, send, finish) {
  const sessionPath = account ? getSessionPath(account) : null;
  const hasSession = sessionPath && fs.existsSync(sessionPath);
  const ytdlpArgs = ['-J', '--no-warnings', '--no-check-certificates', parsed.cleanUrl];
  if (hasSession) ytdlpArgs.push('--cookies', sessionPath);
  if (fs.existsSync(FFMPEG_EXE_PATH)) ytdlpArgs.push('--ffmpeg-location', DOWNLOADS_DIR);

  let result;
  try { result = await spawnYtdlpWithRetry(ytdlpArgs, 30000); }
  catch (err) { send('done', { ok: false, error: err.message }); return finish(); }

  const { code, stdout, stderr } = result;
  if (code !== 0 || !stdout.trim()) {
    const { hint } = classifyYtdlpError(stderr);
    const rawDetail = stderr.trim().split('\n').filter((l) => l.startsWith('[ERROR]') || (!l.startsWith('[') && l.trim())).slice(-2).join(' ').trim();
    send('done', { ok: false, error: 'Could not fetch this content.', hint, detail: rawDetail || undefined });
    return finish();
  }

  let data;
  try { data = JSON.parse(stdout); } catch {
    send('done', { ok: false, error: 'Failed to parse metadata.' }); return finish();
  }

  send('done', {
    ok: true, data: {
      type: parsed.type,
      cleanUrl: parsed.cleanUrl,
      shortcode: parsed.shortcode,
      id: data.id,
      title: data.title || data.description || 'Untitled',
      description: (data.description || data.title || '').slice(0, 300),
      thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[data.thumbnails.length - 1]?.url) || null,
      width: data.width || null,
      height: data.height || null,
      duration: data.duration,
      durationString: data.duration_string,
      viewCount: data.view_count,
      likeCount: data.like_count,
      commentCount: data.comment_count,
      uploader: data.uploader || data.channel,
      uploadDate: data.upload_date,
      formats: buildFormats(data.formats || []),
    }
  });
  finish();
}

// Instagram profile via instaloader Python — streams progress events then done
async function streamProfileInfo(parsed, account, send, finish, keepAlive, res) {
  const { SESSIONS_DIR, getAccounts } = require('../utils/instaloaderManager');

  const pythonCmd = await detectPython();
  if (!pythonCmd) {
    send('done', { ok: false, error: 'Python + instaloader required to fetch profiles.', hint: 'Log in to an Instagram account first — it will be installed automatically.' });
    clearInterval(keepAlive);
    return finish();
  }

  let sessionUsername = account || null;
  if (!sessionUsername) {
    const accounts = getAccounts();
    const withSession = accounts.find((a) => a.sessionExists);
    if (withSession) sessionUsername = withSession.username;
  }

  const payload = JSON.stringify({
    username: parsed.username,
    session_username: sessionUsername || '',
    sessions_dir: SESSIONS_DIR,
    max_posts: PROFILE_MAX_ITEMS,
  });

  return new Promise((resolve) => {
    const proc = spawn(pythonCmd, [PROFILE_HELPER], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    let outBuf = '';
    let profileMeta = null; // from the first 'profile' line
    let responded = false;

    const done = (fn) => {
      if (responded) return;
      responded = true;
      clearInterval(keepAlive);
      fn();
      finish();
      resolve();
    };

    const timer = setTimeout(() => {
      proc.kill();
      done(() => send('done', { ok: false, error: 'Profile fetch timed out. The profile may be very large — try again.' }));
    }, 300000);

    proc.stdin.write(payload + '\n');

    proc.stdout.on('data', (chunk) => {
      outBuf += chunk.toString();
      const lines = outBuf.split('\n');
      outBuf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let msg;
        try { msg = JSON.parse(trimmed); } catch { continue; }

        if (msg.type === 'profile') {
          profileMeta = msg;
          // Emit immediately so the UI can show name/avatar right away
          send('profile', { channelName: msg.channelName, username: msg.username, mediacount: msg.mediacount, avatar: msg.avatar });
        } else if (msg.type === 'progress') {
          send('progress', { fetched: msg.fetched, total: msg.mediacount });
        } else if (msg.type === 'done') {
          clearTimeout(timer);
          if (msg.status === 'error') {
            done(() => send('done', { ok: false, error: msg.message }));
          } else {
            const entries = (msg.posts || []).map((p) => ({
              id: p.shortcode, shortcode: p.shortcode,
              title: p.title || 'Untitled',
              url: p.url, thumbnail: p.thumbnail || null,
              duration: p.duration, viewCount: p.viewCount,
            }));
            done(() => send('done', {
              ok: true, data: {
                type: parsed.type,
                cleanUrl: parsed.cleanUrl,
                username: parsed.username,
                channelName: profileMeta?.channelName || parsed.username,
                avatar: profileMeta?.avatar || null,
                postCount: entries.length,
                truncated: msg.truncated || false,
                entries,
              }
            }));
          }
        }
      }
    });

    proc.stderr.on('data', () => { });

    proc.on('close', () => {
      clearTimeout(timer);
      done(() => send('done', { ok: false, error: 'Profile helper returned no data.' }));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      done(() => send('done', { ok: false, error: `Could not start Python: ${err.message}` }));
    });

    res.on('close', () => { clearTimeout(timer); if (proc.exitCode === null) proc.kill(); });
  });
}

const PROFILE_MAX_ITEMS = 500;

async function fetchProfileInfo(parsed, account, res) {
  const { SESSIONS_DIR } = require('../utils/instaloaderManager');

  // Use the instaloader Python API (like scraping.py) — far more reliable than yt-dlp for profiles.
  const pythonCmd = await detectPython();

  if (!pythonCmd) {
    return res.status(503).json({
      error: 'Python + instaloader required to fetch Instagram profiles.',
      hint: 'Open the Instagram tab and log in first. Python + instaloader will be installed automatically.',
    });
  }

  // Resolve which session to use (prefer the requested account, then any available account)
  const { getAccounts } = require('../utils/instaloaderManager');
  let sessionUsername = account || null;
  if (!sessionUsername) {
    const accounts = getAccounts();
    const withSession = accounts.find((a) => a.sessionExists);
    if (withSession) sessionUsername = withSession.username;
  }

  const payload = JSON.stringify({
    username: parsed.username,
    session_username: sessionUsername || '',
    sessions_dir: SESSIONS_DIR,
    max_posts: PROFILE_MAX_ITEMS,
  });

  return new Promise((resolve) => {
    const proc = spawn(pythonCmd, [PROFILE_HELPER], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    let outBuf = '';
    let responded = false; // guard against double-write (timeout + close race)

    const respond = (fn) => {
      if (responded) return;
      responded = true;
      fn();
      resolve();
    };

    const timer = setTimeout(() => {
      proc.kill();
      respond(() => res.status(504).json({ error: 'Profile fetch timed out. The profile may be very large — try again.' }));
    }, 300000); // 5 minutes

    proc.stdin.write(payload + '\n');

    proc.stdout.on('data', (chunk) => { outBuf += chunk.toString(); });
    proc.stderr.on('data', () => { });

    proc.on('close', () => {
      clearTimeout(timer);
      respond(() => {
        const line = outBuf.trim().split('\n').find((l) => l.trim().startsWith('{'));
        if (!line) {
          return res.status(500).json({ error: 'Profile helper returned no data.' });
        }
        let data;
        try { data = JSON.parse(line); } catch {
          return res.status(500).json({ error: 'Failed to parse profile data.' });
        }
        if (data.status === 'error') {
          return res.status(502).json({ error: data.message });
        }

        const entries = (data.posts || []).map((p) => ({
          id: p.shortcode,
          shortcode: p.shortcode,
          title: p.title || 'Untitled',
          url: p.url,
          thumbnail: p.thumbnail || null,
          duration: p.duration,
          viewCount: p.viewCount,
        }));

        res.json({
          type: parsed.type,
          cleanUrl: parsed.cleanUrl,
          username: parsed.username,
          channelName: data.channelName || parsed.username,
          avatar: data.avatar || null,
          postCount: entries.length,
          truncated: data.truncated || false,
          entries,
        });
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      respond(() => res.status(500).json({ error: `Could not start Python: ${err.message}` }));
    });
  });
}

// ── Download (single) ─────────────────────────────────────────────────────────

router.get('/instagram/download', (req, res) => {
  const { url, quality = 'best', account, outputDir, prefix = '', suffix = '', mainName = '', useNumbering = 'false', sequenceNum = '1' } = req.query;

  if (!url) return res.status(400).json({ error: 'URL is required.' });
  const parsed = parseInstagramUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Invalid Instagram URL.' });

  const { send, finish: finishSSE } = initSSE(res);

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) { res.write(': keepalive\n\n'); if (typeof res.flush === 'function') res.flush(); }
  }, 15000);

  const done = (success, message, filename = '', filePath = '') => {
    clearInterval(keepAlive);
    send('done', { success, message, filename, ...(filePath ? { filePath } : {}) });
    finishSSE();
  };

  const sessionPath = account ? getSessionPath(account) : null;
  const hasSession = sessionPath && fs.existsSync(sessionPath);
  const downloadPath = (outputDir && fs.existsSync(outputDir)) ? outputDir : require('../utils/ytdlpManager').DOWNLOADS_DIR;

  // Build filename template
  const isNumbering = useNumbering === 'true';
  const seqNum = Math.max(1, parseInt(sequenceNum, 10) || 1);
  const cleanPrefix = sanitize(prefix);
  const cleanSuffix = sanitize(suffix);
  const mainPart = mainName.trim() || '%(title)s';

  let filenameTemplate = '';
  if (isNumbering) filenameTemplate += `${String(seqNum).padStart(2, '0')} - `;
  if (cleanPrefix) filenameTemplate += `${cleanPrefix} `;
  filenameTemplate += mainPart;
  if (cleanSuffix) filenameTemplate += ` ${cleanSuffix}`;
  // yt-dlp template for Instagram (no [id] when custom mainName used)
  const hasCustomMain = Boolean(mainName.trim());
  filenameTemplate += hasCustomMain ? '.%(ext)s' : ' [%(id)s].%(ext)s';

  // Use yt-dlp for single post/reel downloads (faster, better format control)
  const outputTemplate = path.join(downloadPath, filenameTemplate);

  const qualityFmt = quality === 'best'
    ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
    : `bestvideo[height<=${quality.replace('p', '')}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality.replace('p', '')}]/best`;

  const ytdlpArgs = [
    '--newline', '--progress', '--no-warnings',
    '-f', qualityFmt,
    '-o', outputTemplate,
    '--no-check-certificates',
    '--restrict-filenames',
  ];
  if (hasSession) ytdlpArgs.push('--cookies', sessionPath);
  if (fs.existsSync(FFMPEG_EXE_PATH)) ytdlpArgs.push('--ffmpeg-location', DOWNLOADS_DIR);
  ytdlpArgs.push(parsed.cleanUrl);

  send('start', { url: parsed.cleanUrl, quality, willMerge: false });

  const PROGRESS_RE = /^\[download\]\s+([\d.]+)%\s+of\s+~?[\d.]+\s*\S+\s+at\s+~?([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/;

  const proc = spawn(YTDLP_EXE_PATH, ytdlpArgs, { windowsHide: true });
  let videoTitle = '';
  let firstDestPath = '';
  let isMultiFile = false;

  proc.stdout.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      const t = line.trim();
      if (!t) continue;

      const pm = t.match(PROGRESS_RE);
      if (pm) {
        send('progress', { percentNum: parseFloat(pm[1]), speed: pm[2], eta: pm[3], filename: videoTitle, phase: 'downloading', phaseLabel: 'Downloading...' });
        continue;
      }

      const destM = t.match(/^\[download\] Destination: (.+)/);
      if (destM) {
        if (!firstDestPath) firstDestPath = destM[1];
        else isMultiFile = true;
        videoTitle = path.basename(destM[1]).replace(/\.\w{2,4}$/, '').replace(/\s*\[[\w-]+\]$/, '').trim();
        send('info', { filename: videoTitle });
        continue;
      }

      if (t.startsWith('[Merger]') || t.startsWith('[ffmpeg]')) {
        send('merge', { label: 'Merging...' });
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg.includes('private') || msg.includes('login')) {
      send('warning', { message: 'This content may require login. Add an Instagram account in the sidebar.' });
    }
  });

  proc.on('close', (code) => {
    if (code === 0) {
      let finalPath = firstDestPath;
      if (isMultiFile && firstDestPath) finalPath = firstDestPath.replace(/\.[^.]+$/, '.mp4');
      done(true, 'Download complete.', videoTitle, finalPath);
    } else {
      done(false, 'Download failed. The content may be private or unavailable.');
    }
  });

  proc.on('error', (err) => done(false, `Failed to start download: ${err.message}`));
  res.on('close', () => { clearInterval(keepAlive); if (proc.exitCode === null) proc.kill('SIGTERM'); });
});

// ── Bulk download ─────────────────────────────────────────────────────────────
// Bulk uses instaloader directly (better for bulk from a profile)

router.get('/instagram/bulk-download', (req, res) => {
  const { urls, account, outputDir, useNumbering = 'false', startNumber = '1', prefix = '', suffix = '', mainName = '' } = req.query;

  if (!urls) return res.status(400).json({ error: 'URLs are required.' });

  const urlList = JSON.parse(urls);
  const { send, finish: finishSSE } = initSSE(res);

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) { res.write(': keepalive\n\n'); if (typeof res.flush === 'function') res.flush(); }
  }, 15000);

  const done = (success, message) => {
    clearInterval(keepAlive);
    send('done', { success, message });
    finishSSE();
  };

  send('start', { total: urlList.length });

  // Download each URL sequentially using the single download endpoint logic
  // We emit per-item events with the index
  let current = 0;

  const downloadNext = () => {
    if (current >= urlList.length) {
      return done(true, `Downloaded ${urlList.length} item(s) successfully.`);
    }
    const item = urlList[current];
    const seqNum = parseInt(startNumber, 10) + current;

    send('item_start', { index: current, url: item.url, title: item.title });

    const sessionPath = account ? getSessionPath(account) : null;
    const hasSession = sessionPath && fs.existsSync(sessionPath);
    const downloadPath = (outputDir && fs.existsSync(outputDir)) ? outputDir : require('../utils/ytdlpManager').DOWNLOADS_DIR;

    const cleanPrefix = sanitize(prefix);
    const cleanSuffix = sanitize(suffix);
    const mainPart = mainName.trim() || '%(title)s';
    const hasCustomMain = Boolean(mainName.trim());
    let filenameTemplate = '';
    if (useNumbering === 'true') filenameTemplate += `${String(seqNum).padStart(2, '0')} - `;
    if (cleanPrefix) filenameTemplate += `${cleanPrefix} `;
    filenameTemplate += mainPart;
    if (cleanSuffix) filenameTemplate += ` ${cleanSuffix}`;
    filenameTemplate += hasCustomMain ? '.%(ext)s' : ' [%(id)s].%(ext)s';

    const outputTemplate = path.join(downloadPath, filenameTemplate);
    const ytdlpArgs = [
      '--newline', '--progress', '--no-warnings',
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
      '-o', outputTemplate,
      '--no-check-certificates', '--restrict-filenames',
      '--sleep-requests', '2',
    ];
    if (hasSession) ytdlpArgs.push('--cookies', sessionPath);
    if (fs.existsSync(FFMPEG_EXE_PATH)) ytdlpArgs.push('--ffmpeg-location', DOWNLOADS_DIR);
    ytdlpArgs.push(item.url);

    const PROGRESS_RE = /^\[download\]\s+([\d.]+)%/;
    const proc = spawn(YTDLP_EXE_PATH, ytdlpArgs, { windowsHide: true });

    let stderrBuf = '';
    let itemFirstDest = '';
    let itemMultiFile = false;

    proc.stdout.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        const t = line.trim();
        const pm = t.match(PROGRESS_RE);
        if (pm) { send('item_progress', { index: current, percent: parseFloat(pm[1]) }); continue; }
        const destM = t.match(/^\[download\] Destination: (.+)/);
        if (destM) {
          if (!itemFirstDest) itemFirstDest = destM[1];
          else itemMultiFile = true;
        }
      }
    });

    proc.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });

    proc.on('close', (code) => {
      let filePath = itemFirstDest;
      if (itemMultiFile && itemFirstDest) filePath = itemFirstDest.replace(/\.[^.]+$/, '.mp4');
      const errorMsg = code !== 0 ? stderrBuf.trim().split('\n').pop() : '';
      send('item_done', { index: current, success: code === 0, filePath: code === 0 && filePath ? filePath : undefined, error: errorMsg || undefined });
      current++;
      setTimeout(downloadNext, 2500); // Instagram rate-limit: wait 2.5s between items
    });

    proc.on('error', (err) => {
      send('item_done', { index: current, success: false, error: err.message });
      current++;
      setTimeout(downloadNext, 2500);
    });

    res.on('close', () => { clearInterval(keepAlive); if (proc.exitCode === null) proc.kill('SIGTERM'); });
  };

  downloadNext();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(s) {
  return s.replace(/%/g, '%%').replace(/[\\/:*?"<>|]/g, '').trim();
}

module.exports = router;
