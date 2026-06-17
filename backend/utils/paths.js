'use strict';

const path = require('path');
const fs   = require('fs');

// In packaged Electron, ELECTRON_USER_DATA = app.getPath('userData')
// e.g. C:\Users\Name\AppData\Roaming\kinetube
// In dev, fall back to the backend/ folder so nothing changes locally.
const BASE = process.env.ELECTRON_USER_DATA
  ? process.env.ELECTRON_USER_DATA
  : path.join(__dirname, '..');

const DOWNLOADS_DIR = path.join(BASE, 'downloads');
const MODELS_DIR    = path.join(BASE, 'models');
const SESSIONS_DIR  = path.join(BASE, 'sessions');

// Create all writable dirs up front so every manager can import this safely.
for (const dir of [DOWNLOADS_DIR, MODELS_DIR, SESSIONS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = { DOWNLOADS_DIR, MODELS_DIR, SESSIONS_DIR };
