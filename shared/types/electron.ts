// the bridge preload.ts exposes as window.electronAPI; absent when the frontend runs in a plain browser

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number; bytesPerSecond: number; transferredBytes: number; totalBytes: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string };

export interface UpdateCheckResult {
  // the updater only works in a packaged build
  isDevMode: boolean;
}

export interface ElectronApi {
  openFolderDialog(): Promise<string | null>;
  getAppVersion(): Promise<string>;
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  checkForUpdates(): Promise<UpdateCheckResult>;
}
