/**
 * download.js
 *
 * Shared HTTPS/HTTP download-with-progress helper used by every tool manager
 * (yt-dlp, ffmpeg, whisper.cpp). Follows redirects and reports progress via a
 * callback rather than returning a stream, since every consumer just wants to
 * drive a setup progress bar.
 */

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');

// onProgress({ downloaded, total, percent, speed })
function downloadFileWithProgress(url, dest, onProgress, maxRedirects = 12) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      if (err) { try { fs.unlinkSync(dest); } catch {} reject(err); }
      else resolve();
    };

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
        const startTime = Date.now();
        const file = fs.createWriteStream(dest);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const speed = downloaded / ((Date.now() - startTime) / 1000 || 0.001);
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

module.exports = { downloadFileWithProgress };
