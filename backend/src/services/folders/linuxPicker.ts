import os from 'node:os';

import { NotSupportedError } from '../../lib/errors.ts';
import { PICKER_TITLE, pickerFailed, runPickerCommand } from './pickerCommand.ts';

import type { PickedFolder } from '@shared/folders.ts';
import type { ProcessResult, ProcessRunner } from '../../lib/runProcess.ts';

interface LinuxPicker {
  command: string;
  args: string[];
}

// zenity ships with GNOME and most other desktops, kdialog with KDE Plasma
const LINUX_PICKERS: LinuxPicker[] = [
  { command: 'zenity', args: ['--file-selection', '--directory', `--title=${PICKER_TITLE}`] },
  { command: 'kdialog', args: ['--getexistingdirectory', os.homedir(), '--title', PICKER_TITLE] },
];

export const NO_LINUX_PICKER = 'The folder picker needs zenity or kdialog. Install one of them, or type the folder path instead.';

// both tools exit with 1 when the person closes the dialog without choosing
function readPickerResult(result: ProcessResult): PickedFolder {
  if (result.isTimedOut || result.exitCode === 1) return { path: null };
  if (result.exitCode !== 0) throw pickerFailed(result.stderr);
  return { path: result.stdout.trim() || null };
}

export async function pickLinuxFolder(run: ProcessRunner): Promise<PickedFolder> {
  for (const picker of LINUX_PICKERS) {
    const result = await runPickerCommand(run, picker.command, picker.args);
    if (result) return readPickerResult(result);
  }
  throw new NotSupportedError(NO_LINUX_PICKER);
}
