const { app, BrowserWindow, Menu, dialog, ipcMain, shell, utilityProcess } = require('electron');
const path = require('path');
const http = require('http');
const fs   = require('fs');

const isDev = !app.isPackaged;
const PORT  = 3001;

let mainWindow;
let serverProcess;

// ── Resolve paths differently in dev vs packaged ──────────────────────────────
function getServerPath() {
  return isDev
    ? path.join(__dirname, '..', 'backend', 'server.js')
    : path.join(process.resourcesPath, 'backend', 'server.js');
}

function getFrontendDist() {
  return isDev
    ? ''
    : path.join(process.resourcesPath, 'frontend', 'dist');
}

// ── Poll /health until the backend is accepting connections ───────────────────
function waitForServer(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(`http://localhost:${PORT}/health`, (res) => {
        if (res.statusCode < 500) return resolve();
        retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (++attempts >= maxAttempts) return reject(new Error('Backend did not start'));
      setTimeout(check, 500);
    };
    check();
  });
}

// ── Log file in userData so it survives between runs ─────────────────────────
let logStream;
function getLogPath() {
  return path.join(app.getPath('userData'), 'backend.log');
}
function openLog() {
  logStream = fs.createWriteStream(getLogPath(), { flags: 'w' });
}
function writeLog(line) {
  if (logStream) logStream.write(line);
  process.stdout.write(line);
}

// ── Spawn the Express server in a utility process (uses Electron's Node.js) ───
function startBackend() {
  openLog();
  writeLog(`[main] server path: ${getServerPath()}\n`);
  writeLog(`[main] frontend dist: ${getFrontendDist()}\n`);
  writeLog(`[main] resourcesPath: ${process.resourcesPath}\n`);

  serverProcess = utilityProcess.fork(getServerPath(), [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ELECTRON_APP: '1',
      ELECTRON_USER_DATA:    app.getPath('userData'),
      ELECTRON_FRONTEND_DIST: getFrontendDist(),
    },
    stdio: 'pipe',
  });

  serverProcess.stdout?.on('data', (d) => writeLog(`[backend] ${d}`));
  serverProcess.stderr?.on('data', (d) => writeLog(`[backend:err] ${d}`));
  serverProcess.on('exit', (code) => writeLog(`[backend] exited with code ${code}\n`));
}

// ── Create the main window ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1280,
    height:   800,
    minWidth:  960,
    minHeight: 640,
    title: 'KineTube',
    icon: path.join(__dirname, '..', 'frontend', 'public', 'favicon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    show: false,
  });

  // Don't show until the page is painted — avoids the blank-white flash
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open <a target="_blank"> links in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // F12 toggles DevTools in all builds (useful for debugging packaged app)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Show loading screen immediately, then switch to app once backend is ready
    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  }
}

// ── Remove native OS menu bar (File / Edit / View / Window / Help) ───────────
Menu.setApplicationMenu(null);

// ── Folder picker: open native dialog parented to the main window ─────────────
ipcMain.handle('open-folder-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Download Folder',
  });
  return canceled ? null : filePaths[0];
});

// ── Enforce a single instance ─────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Startup ───────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // In dev the backend is started by the `dev` npm script (concurrently).
  // In production we start it here.
  createWindow();

  if (!isDev) {
    startBackend();
    let backendReady = false;
    try {
      await waitForServer();
      backendReady = true;
    } catch (err) {
      console.error('Backend failed to start in time:', err.message);
    }

    if (!backendReady) {
      const logPath = getLogPath();
      const logContent = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '(no log)';
      const safeLog = logContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const html = `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:2rem;margin:0">
        <h2 style="color:#ef4444">Backend failed to start</h2>
        <p style="color:#94a3b8;margin-bottom:1rem">Log: <code style="color:#fbbf24">${logPath}</code></p>
        <pre style="background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;font-size:0.8rem;color:#cbd5e1;white-space:pre-wrap">${safeLog}</pre>
      </body></html>`;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      return;
    }

    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.webContents.once('did-fail-load', (event, code, desc) => {
      console.error('Page failed to load:', code, desc);
      mainWindow.loadURL(
        `data:text/html,<body style="background:%230f172a;color:%23ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Page load failed (${code})</h2><p style="color:%2394a3b8">${encodeURIComponent(desc)}</p><p style="color:%2364748b">Press F12 for details.</p></div></body>`
      );
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ── Shutdown ──────────────────────────────────────────────────────────────────
app.on('before-quit', () => {
  serverProcess?.kill();
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});
