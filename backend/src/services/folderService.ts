import fs from 'node:fs';

import { NotFoundError, NotSupportedError } from '../lib/errors.ts';
import { runProcess } from '../lib/runProcess.ts';

import type { Folder, PickedFolder } from '@shared/folders.ts';

export interface FolderService {
  check(folderPath: string): Folder;
  // the desktop app uses Electron's picker; this one serves the frontend running in a plain browser
  pick(): Promise<PickedFolder>;
}

const PICKER_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Download Folder'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }
`.trim();

// a person may leave the dialog open a while, but not forever
const PICKER_TIMEOUT_MS = 2 * 60_000;

function isDirectory(folderPath: string): boolean {
  try {
    return fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

export function createFolderService(platform: NodeJS.Platform = process.platform): FolderService {
  return {
    check(folderPath) {
      if (!isDirectory(folderPath)) throw new NotFoundError(`There's no folder at ${folderPath}. Pick another folder.`);
      return { path: folderPath, exists: true };
    },

    async pick() {
      if (platform !== 'win32') throw new NotSupportedError('The folder picker only works on Windows here. Type the folder path instead.');

      // -EncodedCommand takes UTF-16LE base64, so the script's quotes can never be misread
      const encodedScript = Buffer.from(PICKER_SCRIPT, 'utf16le').toString('base64');
      const args = ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encodedScript];
      const { stdout } = await runProcess('powershell', args, { timeoutMs: PICKER_TIMEOUT_MS });
      return { path: stdout.trim() || null };
    },
  };
}
