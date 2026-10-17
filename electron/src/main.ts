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

async function openPackagedApp(window: BrowserWindow): Promise<void> {
  backend = startBackend();
  if (!(await waitForBackend())) {
    writeLog('[main] the backend did not answer /health in time\n');
    await window.loadURL(backendFailurePage(backendLogPath(), readBackendLog()));
    return;
  }

  window.webContents.once('did-fail-load', (_event, errorCode, description) => {
    writeLog(`[main] page load failed: ${errorCode} ${description}\n`);
    void window.loadURL(loadFailurePage(errorCode, description));
  });
  await window.loadURL(APP_URL);
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

void app.whenReady().then(async () => {
  mainWindow = createMainWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  setUpAutoUpdater(getWindow);

  // in development the npm dev script runs the backend; packaged, Electron starts it
  if (!isDev) await openPackagedApp(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });
});

app.on('before-quit', () => backend?.kill());
app.on('window-all-closed', () => {
  backend?.kill();
  if (process.platform !== 'darwin') app.quit();
});
