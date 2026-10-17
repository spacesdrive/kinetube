import { spawn } from 'node:child_process';

import type { ChildProcess } from 'node:child_process';

// yt-dlp is a PyInstaller launcher that starts the real worker as a child, so the whole tree must go (ADR-021)
export function killProcessTree(child: ChildProcess): void {
  const { pid } = child;
  if (pid === undefined || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true }).on('error', () => {
      // taskkill is part of Windows; if it is missing there is nothing else left to try
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    // ESRCH: the group exited between the exitCode check and the signal, so nothing is left to stop
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

// detached makes the child lead its own process group, which killProcessTree needs on macOS and Linux
export const TREE_SPAWN_OPTIONS = {
  windowsHide: true,
  detached: process.platform !== 'win32',
} as const;
