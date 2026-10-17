import { app, dialog, ipcMain } from 'electron';

import type { BrowserWindow, OpenDialogOptions } from 'electron';

const FOLDER_DIALOG: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'], title: 'Select download folder' };

// the renderer has no Node access, so the folder picker and the version come from here (MAIN_PROCESS.md)
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('open-folder-dialog', async () => {
    const window = getWindow();
    const { canceled, filePaths } = window ? await dialog.showOpenDialog(window, FOLDER_DIALOG) : await dialog.showOpenDialog(FOLDER_DIALOG);
    return canceled ? null : (filePaths[0] ?? null);
  });

  ipcMain.handle('get-app-version', () => app.getVersion());
}
