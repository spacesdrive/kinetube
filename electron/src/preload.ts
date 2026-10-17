import { contextBridge, ipcRenderer } from 'electron';

import type { IpcRendererEvent } from 'electron';
import type { ElectronApi, UpdateStatus } from '../../shared/types/electron';

// the only bridge between the page and Electron; the page has no Node access of its own
const electronApi: ElectronApi = {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // returns the unsubscribe function, so an effect can clean up after itself
  onUpdateStatus(callback) {
    const handler = (_event: IpcRendererEvent, status: UpdateStatus): void => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => {
      ipcRenderer.removeListener('update-status', handler);
    };
  },
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
};

contextBridge.exposeInMainWorld('electronAPI', electronApi);
