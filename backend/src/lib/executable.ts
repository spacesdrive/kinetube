import fs from 'node:fs';

// Windows has no execute bit; elsewhere a downloaded binary needs rwxr-xr-x before it can run
export function markExecutable(filePath: string, platform: NodeJS.Platform = process.platform): void {
  if (platform === 'win32') return;
  fs.chmodSync(filePath, 0o755);
}
