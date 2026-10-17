import fs from 'node:fs';

import { NotFoundError, NotSupportedError } from '../lib/errors.ts';
import { runProcess } from '../lib/runProcess.ts';
import { pickLinuxFolder } from './folders/linuxPicker.ts';
import { pickMacFolder } from './folders/macPicker.ts';
import { pickWindowsFolder } from './folders/windowsPicker.ts';

import type { Folder, PickedFolder } from '@shared/folders.ts';
import type { ProcessRunner } from '../lib/runProcess.ts';

export interface FolderService {
  check(folderPath: string): Folder;
  // the desktop app uses Electron's picker; this one serves the frontend running in a plain browser
  pick(): Promise<PickedFolder>;
}

function isDirectory(folderPath: string): boolean {
  try {
    return fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

async function pickFolder(platform: NodeJS.Platform, run: ProcessRunner): Promise<PickedFolder> {
  if (platform === 'win32') return pickWindowsFolder(run);
  if (platform === 'darwin') return pickMacFolder(run);
  if (platform === 'linux') return pickLinuxFolder(run);
  throw new NotSupportedError("The folder picker doesn't work on this system. Type the folder path instead.");
}

export function createFolderService(platform: NodeJS.Platform = process.platform, run: ProcessRunner = runProcess): FolderService {
  return {
    check(folderPath) {
      if (!isDirectory(folderPath)) throw new NotFoundError(`There's no folder at ${folderPath}. Pick another folder.`);
      return { path: folderPath, exists: true };
    },

    pick: () => pickFolder(platform, run),
  };
}
