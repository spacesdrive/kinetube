const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureYtDlp, ensureFfmpeg, YTDLP_EXE_PATH, FFMPEG_EXE_PATH } = require('./utils/ytdlpManager');
const infoRoutes = require('./routes/info');
const downloadRoutes = require('./routes/download');
const setupRoutes = require('./routes/setup');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.use('/api', infoRoutes);
app.use('/api', downloadRoutes);
app.use('/api', setupRoutes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Server startup ──────────────────────────────────────────────────────────

async function startServer() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║         KineTube Backend v1.0        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ── yt-dlp auto-download ─────────────────────────────────────────────
  const ytdlpOk = await ensureYtDlp();
  if (ytdlpOk) {
    console.log('✅  yt-dlp.exe is ready.');
  } else {
    console.log('❌ yt-dlp.exe could not be downloaded. Please download it manually and place it in backend/downloads.');
  }

  // ── FFmpeg auto-download ─────────────────────────────────────────────
  const ffmpegOk = await ensureFfmpeg();
  if (ffmpegOk) {
    console.log('✅  FFmpeg ready in downloads folder — high-quality merging enabled (1080p, 4K)');
  } else {
    console.log('⚠️  FFmpeg NOT available in backend/downloads');
    console.log('   Downloads above 720p require FFmpeg for video+audio merging.');
    console.log('   Please download ffmpeg.exe manually and place it in backend/downloads.');
  }

  console.log('');

  app.listen(PORT, () => {
    console.log(`🚀  Server listening at http://localhost:${PORT}`);
    console.log(`    Frontend expected at http://localhost:5173\n`);
  });
}

startServer().catch(console.error);
