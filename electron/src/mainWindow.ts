import { BrowserWindow, shell } from 'electron';

import { DEV_SERVER_URL, iconPath, isDev, loadingPagePath, preloadPath } from './appPaths';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'KineTube',
    icon: iconPath,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
    // shown once painted, so there is no white flash before the page draws
    show: false,
  });

  window.once('ready-to-show', () => window.show());

  // links that open a new window go to the system browser instead
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // F12 opens the developer tools in every build, which helps when someone reports a problem
  window.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') window.webContents.toggleDevTools();
  });

  // in development Vite serves the page; packaged, a loading page shows until the backend answers
  if (isDev) void window.loadURL(DEV_SERVER_URL);
  else void window.loadFile(loadingPagePath);
  return window;
}
