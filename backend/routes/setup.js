const express = require('express');
const router  = express.Router();
const { setupToolsWithProgress, checkYtdlpStatus } = require('../utils/ytdlpManager');

// Track whether a setup run is already in progress to prevent parallel downloads.
let setupRunning = false;

// GET /api/setup — SSE stream that downloads yt-dlp + ffmpeg with live progress.
// If both tools are already present it immediately signals 'done' without
// downloading anything, so the frontend can skip the setup screen.
router.get('/setup', (req, res) => {
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

  // Keep-alive to prevent proxy timeouts during large downloads (ffmpeg is ~90 MB)
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
      if (typeof res.flush === 'function') res.flush();
    }
  }, 15000);

  const finish = () => {
    clearInterval(keepAlive);
    setupRunning = false;
    if (!res.writableEnded) {
      res.write('retry: 3600000\n\n');
      send('done', { success: true });
      res.end();
    }
  };

  if (setupRunning) {
    // Another client triggered setup — just tell this one to wait/retry
    send('phase', { tool: 'ytdlp',  phase: 'waiting', message: 'Setup already in progress...' });
    send('phase', { tool: 'ffmpeg', phase: 'waiting', message: 'Setup already in progress...' });
    setTimeout(finish, 2000);
    return;
  }

  setupRunning = true;

  setupToolsWithProgress((event, data) => send(event, data))
    .then(finish)
    .catch((err) => {
      clearInterval(keepAlive);
      setupRunning = false;
      send('done', { success: false, message: err.message });
      if (!res.writableEnded) res.end();
    });

  res.on('close', () => {
    clearInterval(keepAlive);
    // Don't cancel setupRunning — the download continues even if this client
    // disconnects, so a reconnect will find the files already present.
  });
});

// GET /api/setup/check — quick JSON check of tool readiness (no download)
router.get('/setup/check', (req, res) => {
  const status = checkYtdlpStatus();
  res.json({
    ytdlpReady:  status.exists,
    ffmpegReady: status.ffmpegAvailable,
    allReady:    status.exists && status.ffmpegAvailable,
  });
});

module.exports = router;
