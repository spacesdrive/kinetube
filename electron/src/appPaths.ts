import path from 'node:path';

import { app } from 'electron';

export const isDev = !app.isPackaged;

// the backend's port; the window loads from it, so changing it would also move the page's saved settings
export const BACKEND_PORT = 3001;

// the page loads from "localhost" as in 1.x, because localStorage is kept per origin
export const APP_URL = `http://localhost:${BACKEND_PORT}`;
export const DEV_SERVER_URL = 'http://localhost:5173';

// compiled files run from electron/dist, so the project root is two folders up
const projectRoot = path.join(__dirname, '..', '..');

export const preloadPath = path.join(__dirname, 'preload.js');
export const loadingPagePath = path.join(projectRoot, 'electron', 'loading.html');
export const iconPath = path.join(projectRoot, 'build', 'icon.png');

export function backendEntryPath(): string {
  return path.join(process.resourcesPath, 'backend', 'dist', 'server.js');
}

export function frontendDistPath(): string {
  return path.join(process.resourcesPath, 'frontend', 'dist');
}

export function backendLogPath(): string {
  return path.join(app.getPath('userData'), 'backend.log');
}
