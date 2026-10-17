import { app, BrowserWindow, Menu } from 'electron';

import { APP_URL, backendLogPath, isDev } from './appPaths';
import { readBackendLog, writeLog } from './backendLog';
import { startBackend, waitForBackend } from './backendProcess';
import { backendFailurePage, loadFailurePage } from './errorPages';
import { registerIpcHandlers } from './ipcHandlers';
import { createMainWindow } from './mainWindow';
import { setUpAutoUpdater } from './updater';

import type { UtilityProcess } from 'electron';

let mainWindow: BrowserWindow | null = null;
let backend: UtilityProcess | null = null;
const getWindow = (): BrowserWindow | null => mainWindow;

function ensureBackend(): UtilityProcess {
  if (backend) return backend;
  const started = startBackend();
  started.once('exit', () => {
    if (backend === started) backend = null;
  });
  backend = started;
  return started;
}

async function loadPackagedApp(window: BrowserWindow): Promise<void> {
  if (!(await waitForBackend(ensureBackend()))) {
    writeLog('[main] the backend exited or did not answer /health in time\n');
    await window.loadURL(backendFailurePage(backendLogPath(), readBackendLog()));
    return;
  }

  window.webContents.once('did-fail-load', (_event, errorCode, description) => {
    writeLog(`[main] page load failed: ${errorCode} ${description}\n`);
    void window.loadURL(loadFailurePage(errorCode, description));
  });
  await window.loadURL(APP_URL);
}

// on macOS a window can be closed and reopened from the dock while the app keeps running
function openWindow(): void {
  const window = createMainWindow();
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  // in development the npm dev script runs the backend; packaged, Electron starts it
  if (isDev) return;
  loadPackagedApp(window).catch((error: unknown) => writeLog(`[main] could not open the app: ${String(error)}\n`));
}

// the app has its own sidebar, so the native File / Edit / View menu is removed
Menu.setApplicationMenu(null);
registerIpcHandlers(getWindow);

// a second launch focuses the window that is already open instead of starting another backend
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

void app.whenReady().then(() => {
  openWindow();
  setUpAutoUpdater(getWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

// the backend lives as long as the app, so a window reopened on macOS finds it still running
app.on('before-quit', () => backend?.kill());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
