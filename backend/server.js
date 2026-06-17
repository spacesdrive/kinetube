const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');
const { ensureYtDlp, ensureFfmpeg, YTDLP_EXE_PATH, FFMPEG_EXE_PATH } = require('./utils/ytdlpManager');
const infoRoutes = require('./routes/info');
const downloadRoutes = require('./routes/download');
const setupRoutes = require('./routes/setup');
const instagramRoutes = require('./routes/instagram');
const transcribeRoutes = require('./routes/transcribe');

const app = express();
const PORT = process.env.PORT || 3001;

// In Electron (packaged or dev), all requests come from localhost — allow everything.
// In standalone dev mode, only allow the Vite dev server origin.
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', `http://localhost:${process.env.PORT || 3001}`];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin) || !!process.env.ELECTRON_APP),
}));
app.use(express.json());

app.use('/api', infoRoutes);
app.use('/api', downloadRoutes);
app.use('/api', setupRoutes);
app.use('/api', instagramRoutes);
app.use('/api', transcribeRoutes);

// ── Image proxy (for Instagram CDN thumbnails blocked by CORS/hotlink) ─────────
// GET /api/proxy/img?url=<encoded>
// Proxies images from known CDN hostnames (Instagram + YouTube) to avoid browser CORS/hotlink blocks.
const IMG_PROXY_ALLOWED = [
  // Instagram / Facebook CDN
  'cdninstagram.com', 'fbcdn.net', 'instagram.com', 'pinimg.com',
  // YouTube CDN (channel avatars, thumbnails)
  'yt3.ggpht.com', 'yt3.googleusercontent.com', 'ytimg.com', 'i.ytimg.com',
];

function refererForHost(host) {
  if (host.includes('ytimg.com') || host.includes('ggpht.com') || host.includes('googleusercontent.com'))
    return 'https://www.youtube.com/';
  if (host.includes('instagram.com') || host.includes('fbcdn.net'))
    return 'https://www.instagram.com/';
  return 'https://www.google.com/';
}

app.get('/api/proxy/img', (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).end();

  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).end(); }

  const host = parsed.hostname;
  if (!IMG_PROXY_ALLOWED.some((d) => host.endsWith(d))) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  const mod = parsed.protocol === 'https:' ? https : http;
  const request = mod.get(raw, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': refererForHost(host),
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    },
  }, (imgRes) => {
    // Follow one redirect level
    if ((imgRes.statusCode === 301 || imgRes.statusCode === 302) && imgRes.headers.location) {
      imgRes.resume();
      const loc = imgRes.headers.location;
      try {
        const next = new URL(loc);
        if (!IMG_PROXY_ALLOWED.some((d) => next.hostname.endsWith(d))) return res.status(403).end();
      } catch { return res.status(400).end(); }
      return app.handle(Object.assign(req, { url: `/api/proxy/img?url=${encodeURIComponent(loc)}` }), res);
    }
    if (imgRes.statusCode !== 200) { imgRes.resume(); return res.status(imgRes.statusCode || 502).end(); }
    res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    imgRes.pipe(res);
  });
  request.on('error', () => { if (!res.headersSent) res.status(502).end(); });
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Serve built frontend in Electron production mode ──────────────────────────
// When packaged, Express is the only server — it must serve both the API and the
// React static files. ELECTRON_FRONTEND_DIST is injected by electron/main.js.
if (process.env.ELECTRON_APP && process.env.ELECTRON_FRONTEND_DIST) {
  const dist = process.env.ELECTRON_FRONTEND_DIST;
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ── Server startup ──────────────────────────────────────────────────────────

// Hold a module-level reference so the server keeps the Node event loop alive
// and cannot be garbage collected while the process is running.
let _server;

async function startServer() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║         KineTube Backend v1.0        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Listen first so /health responds immediately (Electron waits on it)
  await new Promise((resolve, reject) => {
    _server = app.listen(PORT, resolve);
    _server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌  Port ${PORT} is already in use. Stop the other instance and retry.`);
        process.exit(1);
      }
      reject(err);
    });
  });
  console.log(`🚀  Server listening at http://localhost:${PORT}`);

  // Binary checks run after server is already up — non-blocking for Electron
  ensureYtDlp().then((ok) => {
    console.log(ok ? '✅  yt-dlp ready.' : '❌  yt-dlp not found — run the app to trigger setup.');
  });

  ensureFfmpeg().then((ok) => {
    if (ok) {
      console.log('✅  FFmpeg ready — high-quality merging enabled (1080p, 4K)');
    } else {
      console.log('⚠️  FFmpeg not available. Downloads above 720p require FFmpeg.');
      console.log('   Place ffmpeg.exe manually in backend/downloads.');
    }
  });
}

startServer().catch((err) => { console.error('Fatal startup error:', err); process.exit(1); });
