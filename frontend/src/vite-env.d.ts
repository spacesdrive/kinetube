/// <reference types="vite/client" />

import type { ElectronApi } from '@shared/electron.ts';

declare global {
  interface Window {
    // set by electron/preload.ts; missing when the frontend runs in a plain browser during development
    electronAPI?: ElectronApi;
  }
}
