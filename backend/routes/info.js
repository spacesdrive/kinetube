const express = require('express');
const router = express.Router();
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const { checkYtdlpStatus, getYtdlpPath } = require('../utils/ytdlpManager');
const { parseYouTubeUrl } = require('../utils/urlParser');

// GET /api/ytdlp-status
router.get('/ytdlp-status', async (req, res) => {
  try {
    const status = await checkYtdlpStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/info  — fetch metadata for a video or list entries for a channel
router.post('/info', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return res.status(400).json({
      error:
        'Invalid YouTube URL. Please paste a valid YouTube video, Shorts, or channel URL.',
    });
  }

  const ytdlpStatus = await checkYtdlpStatus();
  if (!ytdlpStatus.exists) {
    return res.status(503).json({
      error: 'yt-dlp.exe not found. Please download it first.',
      ytdlpStatus,
    });
  }

  const ytdlpPath = getYtdlpPath();

  // ── Single video or Shorts ────────────────────────────────────────────────
  if (parsed.type === 'video' || parsed.type === 'shorts') {
    try {
      const info = await getVideoInfo(ytdlpPath, parsed.cleanUrl);
      return res.json({ type: parsed.type, cleanUrl: parsed.cleanUrl, ...info });
    } catch (err) {
      return res
        .status(500)
        .json({ error: `Failed to fetch video info: ${err.message}` });
    }
  }

  // ── Channel videos / shorts tab ───────────────────────────────────────────
  if (
    parsed.type === 'channel_videos' ||
    parsed.type === 'channel_shorts' ||
    parsed.type === 'channel'
  ) {
    try {
      const info = await getChannelInfo(ytdlpPath, parsed.cleanUrl);
      return res.json({
        type: parsed.type,
        cleanUrl: parsed.cleanUrl,
        channelPath: parsed.channelPath,
        ...info,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: `Failed to fetch channel info: ${err.message}` });
    }
  }

  return res.status(400).json({ error: 'Unsupported URL type.' });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function getVideoInfo(ytdlpPath, url) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, [
      '-J',
      '--no-warnings',
      '--no-check-certificates',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'yt-dlp exited with error'));

      let data;
      try {
        data = JSON.parse(stdout);
      } catch (e) {
        return reject(new Error('Failed to parse yt-dlp JSON output'));
      }

      // Build quality options from formats array
      const videoFormats = [];
      const audioFormats = [];
      const seenHeights = new Set();
      const seenBitrates = new Set();

      if (Array.isArray(data.formats)) {
        for (const f of data.formats) {
          // Video-only streams (for merge)
          if (f.vcodec && f.vcodec !== 'none' && f.height && f.height > 0) {
            if (!seenHeights.has(f.height)) {
              seenHeights.add(f.height);
              videoFormats.push({
                formatId: f.format_id,
                height: f.height,
                fps: f.fps || 30,
                ext: f.ext,
                filesize: f.filesize || f.filesize_approx || null,
                vcodec: f.vcodec,
                label: `${f.height}p${f.fps >= 50 ? f.fps : ''}`,
                needsMerge: !f.acodec || f.acodec === 'none',
              });
            }
          }
          // Audio-only streams
          if (f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')) {
            const abr = Math.round(f.abr || f.tbr || 0);
            if (abr > 0 && !seenBitrates.has(abr)) {
              seenBitrates.add(abr);
              audioFormats.push({
                formatId: f.format_id,
                abr,
                ext: f.ext,
                filesize: f.filesize || f.filesize_approx || null,
                acodec: f.acodec,
                label: `${abr}kbps ${f.ext.toUpperCase()}`,
              });
            }
          }
        }
      }

      videoFormats.sort((a, b) => b.height - a.height);
      audioFormats.sort((a, b) => b.abr - a.abr);

      resolve({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        durationString: data.duration_string,
        viewCount: data.view_count,
        likeCount: data.like_count,
        uploader: data.uploader,
        uploadDate: data.upload_date,
        description: data.description?.slice(0, 300),
        videoFormats,
        audioFormats,
      });
    });

    proc.on('error', reject);
  });
}

function getChannelInfo(ytdlpPath, channelUrl) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, [
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
      '--no-check-certificates',
      channelUrl,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'yt-dlp exited with error'));

      let data;
      try {
        data = JSON.parse(stdout);
      } catch {
        return reject(new Error('Failed to parse yt-dlp JSON output'));
      }

      const entries = (data.entries || [])
        .filter((e) => e && e.id)
        .map((e) => ({
          id: e.id,
          title: e.title || 'Untitled',
          url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
          duration: e.duration || null,
          durationString: e.duration_string || null,
          viewCount: e.view_count || null,
          uploadDate: e.upload_date || null,
          thumbnail:
            (e.thumbnails && e.thumbnails[e.thumbnails.length - 1]?.url) ||
            `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
        }));

      resolve({
        channelName: data.channel || data.uploader || data.title || 'Unknown Channel',
        channelId: data.channel_id || data.id,
        channelUrl: data.channel_url || channelUrl,
        avatar:
          data.thumbnails && data.thumbnails.length > 0
            ? data.thumbnails[data.thumbnails.length - 1].url
            : null,
        videoCount: entries.length,
        entries,
      });
    });

    proc.on('error', reject);
  });
}

// GET /api/dialog/folder — opens a native Windows folder-picker dialog and returns the chosen path.
//
// WHY -EncodedCommand instead of -Command "...":
//   When Node spawns powershell via cmd.exe, cmd.exe processes the argument string first.
//   Any double-quotes inside the -Command "..." argument terminate the outer quote early,
//   so string literals like "Select Download Folder" break the whole command.
//   -EncodedCommand accepts a base64-encoded UTF-16LE script that never passes through
//   cmd.exe quote processing — completely immune to this class of bug.
router.get('/dialog/folder', (req, res) => {
  const psCode = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = 'Select Download Folder'
$f.ShowNewFolderButton = $true
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $f.SelectedPath }
`.trim();

  // PowerShell -EncodedCommand requires the script encoded as UTF-16LE then base64
  const encoded = Buffer.from(psCode, 'utf16le').toString('base64');

  try {
    const result = execSync(
      `powershell -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${encoded}`,
      { encoding: 'utf8', timeout: 120000 }
    ).trim();

    res.json({ path: result || null });
  } catch {
    // User cancelled the dialog (exit code 1) or the dialog was dismissed
    res.json({ path: null });
  }
});

// GET /api/validate-path — checks whether a directory path exists on the server
router.get('/validate-path', (req, res) => {
  const { dir } = req.query;
  if (!dir) return res.json({ valid: false });
  res.json({ valid: fs.existsSync(dir.trim()) });
});

module.exports = router;
