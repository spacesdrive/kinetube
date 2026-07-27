/**
 * Launches Electron with a clean environment.
 *
 * Electron-based editors and terminals (VS Code, Cursor, etc.) commonly leak
 * ELECTRON_RUN_AS_NODE=1 into child shells - it tells any Electron binary to
 * behave as a plain Node.js process instead of launching the Electron
 * runtime. If that variable is inherited here, `electron.app` never exists,
 * and electron-updater's app-version lookup crashes at startup before any
 * window opens (see DECISIONS.md). Spawning through this wrapper strips it
 * so `npm run dev`/`dist:*` work regardless of the parent terminal.
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['--no-deprecation', path.join(__dirname, '..')], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to launch Electron:', err.message);
  process.exit(1);
});
