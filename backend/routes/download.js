const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { YTDLP_EXE_PATH, FFMPEG_EXE_PATH } = require('../utils/ytdlpManager');
const { parseYouTubeUrl } = require('../utils/urlParser');
const {
  addPendingDownload,
  updatePendingDownloadTitle,
  removePendingDownload,
  getPendingDownloads,
} = require('../utils/pendingDownloads');

const { DOWNLOADS_DIR: DEFAULT_DOWNLOADS_DIR } = require('../utils/paths');

// Active single-video downloads, keyed by pendingId, so POST /download/:id/pause
// (a separate HTTP request) can reach into the GET /download SSE handler's
// closure and pause it. See "Pausing a download" below.
const activeDownloads = new Map();

const QUALITY_FORMATS = {
  best: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
  '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best',
  '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best',
  '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best',
  '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best',
  '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best',
  '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best',
};
const AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio';

// Standard yt-dlp progress line: [download]  45.2% of 1.46GiB at 3.56MiB/s ETA 06:41
const PROGRESS_RE =
  /^\[download\]\s+([\d.]+)%\s+of\s+~?[\d.]+\s*\S+\s+at\s+~?([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/;

/**
 * Derive a clean display title from a yt-dlp destination path.
 *   "My_Title [abc123XYZ].f140.m4a"  →  "My Title"
 *   "My_Title [abc123XYZ].mp4"       →  "My Title"
 */
function cleanTitle(filePath) {
  return path.basename(filePath)
    .replace(/\.f\d+\.\w+$/, '')         // strip .f140.m4a
    .replace(/\.\w{2,4}$/, '')           // strip remaining extension
    .replace(/\s*\[[\w-]{6,}\]\s*$/, '') // strip [videoId]
    .replace(/_/g, ' ')                  // undo --restrict-filenames underscores
    .trim();
}

/**
 * Sanitize a user-supplied prefix/suffix string (plain text, NOT a yt-dlp template):
 *  - Escape bare % so yt-dlp doesn't treat them as variable starts
 *  - Strip characters that are invalid in Windows file names
 */
function sanitizeNamePart(s) {
  return s
    .replace(/%/g, '%%')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();
}

/**
 * Sanitize a user-supplied yt-dlp output template (e.g. "%(title)s" or "%(uploader)s - %(title)s").
 * We preserve % and () since those are used by yt-dlp's own template syntax.
 * Only remove characters that are always invalid in Windows file names.
 */
function sanitizeTemplate(s) {
  return s.replace(/[\\/:*?"<>|]/g, '').trim();
}

// GET /api/download — SSE streaming download
router.get('/download', (req, res) => {
  const {
    url,
    quality = 'best',
    audioOnly = 'false',
    outputDir,
    prefix = '',
    suffix = '',
    mainName = '',
    useNumbering = 'false',
    sequenceNum = '1',
  } = req.query;

  if (!url) return res.status(400).json({ error: 'URL is required.' });
  const parsed = parseYouTubeUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Invalid YouTube URL.' });
  if (!fs.existsSync(YTDLP_EXE_PATH)) return res.status(503).json({ error: 'yt-dlp.exe not found.' });

  // ── SSE headers ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);

  const send = (event, data) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  // ── Resolve output directory ─────────────────────────────────────────────────
  let downloadPath = DEFAULT_DOWNLOADS_DIR;
  if (outputDir && outputDir.trim()) {
    const resolvedDir = outputDir.trim();
    if (fs.existsSync(resolvedDir)) {
      downloadPath = resolvedDir;
    } else {
      send('warning', { message: `Output folder "${resolvedDir}" was not found. Using the default downloads folder.` });
    }
  }

  // ── Build output filename template ───────────────────────────────────────────
  const isAudioOnly = audioOnly === 'true';
  const ffmpegAvailable = fs.existsSync(FFMPEG_EXE_PATH);
  const isNumbering = useNumbering === 'true';
  const seqNum = Math.max(1, parseInt(sequenceNum, 10) || 1);
  const cleanPrefix = sanitizeNamePart(prefix);
  const cleanSuffix = sanitizeNamePart(suffix);
  // mainName is a yt-dlp output template — preserve % for template vars.
  // Fall back to %(title)s (original video title) when empty.
  const mainTemplate = sanitizeTemplate(mainName) || '%(title)s';

  let titlePart = '';
  if (isNumbering) {
    titlePart += `${String(seqNum).padStart(2, '0')} - `;
  }
  if (cleanPrefix) titlePart += `${cleanPrefix} `;
  titlePart += mainTemplate;
  if (cleanSuffix) titlePart += ` ${cleanSuffix}`;
  // Append [%(id)s] only when the user has NOT provided a custom main template.
  // With a custom template the user controls the entire filename — appending the
  // video ID would be unwanted and confusing.
  const hasCustomMain = Boolean(mainName.trim());
  titlePart += hasCustomMain ? '.%(ext)s' : ' [%(id)s].%(ext)s';

  const outputTemplate = path.join(downloadPath, titlePart);

  // Keep connection alive every 20 s during long downloads
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
      if (typeof res.flush === 'function') res.flush();
    }
  }, 20000);

  // Set by pause() below. Kept as a plain closure variable (not part of the
  // activeDownloads Map's value) so finish() and the SSE res.on('close')
  // handler always agree on it regardless of firing order - see "Pausing a
  // download" below.
  let isPaused = false;

  const finish = (code) => {
    clearInterval(keepAlive);
    activeDownloads.delete(pendingId);

    if (isPaused) {
      // Keep the pending-download record - Resume re-issues the identical
      // request and yt-dlp picks the .part file back up on its own.
      send('paused', { message: 'Download paused.' });
      if (!res.writableEnded) res.end();
      return;
    }

    removePendingDownload(pendingId);
    // Large retry value tells EventSource not to reconnect immediately.
    if (!res.writableEnded) res.write('retry: 3600000\n\n');
    if (code === 0) {
      // For merged downloads (video+audio → .mp4) yt-dlp writes the final file
      // to a path derived from the first Destination but with .mp4 extension.
      // The first Destination has a format code appended: "Title.f299.webm" — strip
      // both the format ID (.f299) and extension before appending .mp4.
      let finalPath = firstDestPath;
      if (isMultiFile && firstDestPath) {
        const fmtMatch = firstDestPath.match(/^(.+?)\.f\d+\.[^.]+$/);
        finalPath = (fmtMatch ? fmtMatch[1] : firstDestPath.replace(/\.[^.]+$/, '')) + '.mp4';
      } else if (isAudioOnly && firstDestPath) {
        finalPath = firstDestPath.replace(/\.[^.]+$/, '.mp3');
      }
      send('done', {
        success: true,
        message: 'Download complete. File saved to the downloads folder.',
        filename: videoTitle,
        filePath: finalPath,
      });
    } else {
      send('done', { success: false, message: 'Download failed. Check the server console for details.' });
    }
    if (!res.writableEnded) res.end();
  };

  // ── yt-dlp args ─────────────────────────────────────────────────────────────
  const formatStr = isAudioOnly
    ? AUDIO_FORMAT
    : (QUALITY_FORMATS[quality] || QUALITY_FORMATS['best']);

  // willMerge: true when yt-dlp will download video+audio as separate files
  // and ffmpeg is needed to merge them.
  const willMerge = !isAudioOnly && ffmpegAvailable;

  const args = [
    '--newline', '--progress', '--no-warnings',
    '-f', formatStr,
    '-o', outputTemplate,
    '--no-check-certificates',
    '--restrict-filenames',
  ];

  if (ffmpegAvailable) args.push('--ffmpeg-location', DEFAULT_DOWNLOADS_DIR);

  if (isAudioOnly) {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    if (!ffmpegAvailable) {
      send('warning', { message: 'ffmpeg.exe not found. MP3 conversion will fail. Place ffmpeg.exe in backend/downloads/.' });
    }
  } else {
    args.push('--merge-output-format', 'mp4');
    const needsMerge = ['best', '2160p', '1440p', '1080p'].includes(quality);
    if (needsMerge && !ffmpegAvailable) {
      send('warning', { message: 'ffmpeg.exe not found — falling back to best combined format (may be capped at 720p).' });
    }
  }

  args.push(parsed.cleanUrl);

  // Recorded so the next app launch can offer to resume this download if the
  // app closes before it finishes - see docs/architecture/backend/MANAGERS.md.
  const pendingId = addPendingDownload({
    url: parsed.cleanUrl,
    quality,
    audioOnly: isAudioOnly,
    outputDir,
    prefix,
    suffix,
    mainName,
    useNumbering: isNumbering,
    sequenceNum: seqNum,
  });

  // Send start — willMerge tells the frontend to pre-scale the progress bar.
  // id lets the frontend later call POST /download/:id/pause on this request.
  send('start', { id: pendingId, url: parsed.cleanUrl, quality, audioOnly: isAudioOnly, willMerge });

  // ── Spawn ────────────────────────────────────────────────────────────────────
  const proc = spawn(YTDLP_EXE_PATH, args, { windowsHide: true });

  // ── Pausing a download ────────────────────────────────────────────────────
  // "Pause" is not OS-level process suspension (SIGSTOP has no Windows
  // equivalent without a native addon) - it is the same abrupt SIGTERM kill
  // "Cancel" already used, just with the pending-download record deliberately
  // kept instead of cleared. yt-dlp already writes its .part file
  // incrementally, so an abrupt kill here is exactly as resumable as the
  // crash-recovery path in pendingDownloads.js (see DECISIONS.md ADR-020).
  activeDownloads.set(pendingId, {
    pause: () => {
      isPaused = true;
      if (proc.exitCode === null) proc.kill('SIGTERM');
    },
  });

  let videoTitle = '';
  let firstDestPath = '';   // actual filesystem path of the first output file
  // destCount tracks how many Destination: lines appeared (1=video, 2=audio for split)
  let destCount = 0;
  // isMultiFile becomes true when we see a 2nd Destination line
  let isMultiFile = false;
  // For audio-only the first (and only) phase is already audio
  let phase = isAudioOnly ? 'audio' : 'video';

  const phaseLabel = () =>
    phase === 'video' ? 'Downloading video...'
      : phase === 'audio' ? 'Downloading audio...'
        : 'Converting...';

  proc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      // ── Progress ────────────────────────────────────────────────────────────
      const pm = t.match(PROGRESS_RE);
      if (pm) {
        const pct = parseFloat(pm[1]);
        send('progress', {
          percentNum: isFinite(pct) ? pct : 0,
          speed: pm[2] || '',
          eta: pm[3] || '',
          filename: videoTitle,
          phase,
          phaseLabel: phaseLabel(),
          isMultiFile,
        });
        continue;
      }

      // ── New destination file ─────────────────────────────────────────────────
      const destM = t.match(/^\[download\] Destination: (.+)/);
      if (destM) {
        destCount++;
        if (destCount === 1) {
          firstDestPath = destM[1];
          videoTitle = cleanTitle(destM[1]);
          updatePendingDownloadTitle(pendingId, videoTitle);
          phase = isAudioOnly ? 'audio' : 'video';
        } else {
          // Second destination = audio track in a split video+audio download
          isMultiFile = true;
          phase = 'audio';
          send('phaseChange', { isMultiFile: true });
        }
        send('info', { filename: videoTitle });
        continue;
      }

      // ── Already downloaded ──────────────────────────────────────────────────
      if (t.includes('[download]') && t.includes('has already been downloaded')) {
        send('info', { message: t });
        continue;
      }

      // ── FFmpeg / merge / audio-convert stage ────────────────────────────────
      if (t.startsWith('[Merger]') || t.startsWith('[ffmpeg]') || t.startsWith('[ExtractAudio]')) {
        phase = 'merging';
        const label = isAudioOnly ? 'Converting to MP3...' : 'Merging video and audio...';
        send('merge', { label });
        continue;
      }

      // ── Other info ──────────────────────────────────────────────────────────
      if (t.startsWith('[')) send('log', { message: t });
    }
  });

  proc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) send('error_log', { message: msg });
  });

  proc.on('close', finish);
  proc.on('error', (err) => {
    clearInterval(keepAlive);
    activeDownloads.delete(pendingId);
    removePendingDownload(pendingId);
    send('done', { success: false, message: `Failed to start yt-dlp: ${err.message}` });
    if (!res.writableEnded) res.end();
  });

  // Cancel: client closed the SSE stream. Deliberately removes the pending-download
  // record too - a user-initiated cancel should not be offered back as "resume" on
  // the next launch, only a download that was cut off by the app itself closing (or
  // explicitly paused - isPaused is set by pause() above, shared via closure so this
  // handler agrees with finish() regardless of which one runs first).
  res.on('close', () => {
    clearInterval(keepAlive);
    activeDownloads.delete(pendingId);
    if (!isPaused) removePendingDownload(pendingId);
    if (proc.exitCode === null) proc.kill('SIGTERM');
  });
});

// POST /api/download/:id/pause — pause an in-progress single-video download.
// Kills the yt-dlp process (same mechanism as cancel) but keeps the pending-
// download record so the exact request can be re-issued later; yt-dlp resumes
// its own partial file. 404 if the id isn't an active download (already
// finished, already paused, or never existed).
router.post('/download/:id/pause', (req, res) => {
  const entry = activeDownloads.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'No active download with that id.' });
  entry.pause();
  res.json({ success: true });
});

// GET /api/download/pending — single-video downloads that were still in
// flight the last time the app closed, so the frontend can offer to resume them
router.get('/download/pending', (req, res) => {
  res.json({ pending: getPendingDownloads() });
});

// DELETE /api/download/pending/:id — dismiss a resumable download without
// restarting it (the partial file, if any, is left on disk untouched)
router.delete('/download/pending/:id', (req, res) => {
  removePendingDownload(req.params.id);
  res.json({ success: true });
});

module.exports = router;
