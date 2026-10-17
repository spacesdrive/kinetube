import { ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

import { isDev } from './appPaths';
import { writeLog } from './backendLog';

import type { BrowserWindow } from 'electron';
import type { UpdateCheckResult, UpdateStatus } from '../../shared/types/electron';

// the first check waits a few seconds so it never slows the app's own start
const FIRST_CHECK_DELAY_MS = 5_000;

function sendStatus(getWindow: () => BrowserWindow | null, status: UpdateStatus): void {
  getWindow()?.webContents.send('update-status', status);
}

function forwardUpdaterEvents(getWindow: () => BrowserWindow | null): void {
  autoUpdater.on('checking-for-update', () => sendStatus(getWindow, { type: 'checking' }));
  autoUpdater.on('update-available', (info) => sendStatus(getWindow, { type: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => sendStatus(getWindow, { type: 'not-available' }));
  autoUpdater.on('download-progress', (progress) => {
    sendStatus(getWindow, {
      type: 'progress',
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferredBytes: progress.transferred,
      totalBytes: progress.total,
    });
  });
  autoUpdater.on('update-downloaded', () => sendStatus(getWindow, { type: 'downloaded' }));
  autoUpdater.on('error', (error) => {
    writeLog(`[updater:err] ${error.message}\n`);
    sendStatus(getWindow, { type: 'error', message: `The update couldn't be downloaded: ${error.message}` });
  });
}

// the person decides when to download and install; nothing happens behind their back
export function setUpAutoUpdater(getWindow: () => BrowserWindow | null): void {
  // app-update.yml, which the updater reads, exists only in a packaged build
  ipcMain.handle('check-for-updates', async (): Promise<UpdateCheckResult> => {
    if (isDev) return { isDevMode: true };
    await autoUpdater.checkForUpdates();
    return { isDevMode: false };
  });
  ipcMain.handle('download-update', async () => {
    await autoUpdater.downloadUpdate();
  });
  ipcMain.handle('install-update', () => autoUpdater.quitAndInstall(false, true));
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = {
    info: (message: unknown) => writeLog(`[updater] ${String(message)}\n`),
    warn: (message: unknown) => writeLog(`[updater:warn] ${String(message)}\n`),
    error: (message: unknown) => writeLog(`[updater:err] ${String(message)}\n`),
    debug: () => {},
  };
  forwardUpdaterEvents(getWindow);

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error: unknown) => writeLog(`[updater:err] check failed: ${(error as Error).message}\n`));
  }, FIRST_CHECK_DELAY_MS);
}
