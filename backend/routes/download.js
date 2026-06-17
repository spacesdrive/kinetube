const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { YTDLP_EXE_PATH, FFMPEG_EXE_PATH } = require('../utils/ytdlpManager');
const { parseYouTubeUrl } = require('../utils/urlParser');

const { DOWNLOADS_DIR: DEFAULT_DOWNLOADS_DIR } = require('../utils/paths');

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

  const finish = (code) => {
    clearInterval(keepAlive);
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

  // Send start — willMerge tells the frontend to pre-scale the progress bar
  send('start', { url: parsed.cleanUrl, quality, audioOnly: isAudioOnly, willMerge });

  // ── Spawn ────────────────────────────────────────────────────────────────────
  const proc = spawn(YTDLP_EXE_PATH, args, { windowsHide: true });

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
    send('done', { success: false, message: `Failed to start yt-dlp: ${err.message}` });
    if (!res.writableEnded) res.end();
  });

  // Cancel: client closed the SSE stream
  res.on('close', () => {
    clearInterval(keepAlive);
    if (proc.exitCode === null) proc.kill('SIGTERM');
  });
});

module.exports = router;
