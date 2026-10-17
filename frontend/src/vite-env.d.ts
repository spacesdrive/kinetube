/// <reference types="vite/client" />

import type { ElectronApi } from '@shared/electron.ts';

declare global {
  // injected by vite.config.ts from the root package.json
  const __APP_VERSION__: string;

  interface Window {
    // set by electron/preload.ts; missing when the frontend runs in a plain browser during development
    electronAPI?: ElectronApi;
  }
}
