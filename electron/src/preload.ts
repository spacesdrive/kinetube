const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  getAppVersion:    () => ipcRenderer.invoke('get-app-version'),

  // Auto-updater bridge
  // Returns a cleanup function — call it in useEffect's return to avoid leaks.
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  downloadUpdate:   () => ipcRenderer.invoke('download-update'),
  installUpdate:    () => ipcRenderer.invoke('install-update'),
  checkForUpdates:  () => ipcRenderer.invoke('check-for-updates'),
});
