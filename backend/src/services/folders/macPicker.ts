import { NotSupportedError } from '../../lib/errors.ts';
import { PICKER_TITLE, pickerFailed, runPickerCommand } from './pickerCommand.ts';

import type { PickedFolder } from '@shared/folders.ts';
import type { ProcessRunner } from '../../lib/runProcess.ts';

const PICKER_SCRIPT = `POSIX path of (choose folder with prompt "${PICKER_TITLE}")`;

// pressing Cancel ends osascript with "User canceled. (-128)"
const CANCELLED_PATTERN = /User cancel+ed|\(-128\)/i;

// "/Users/you/Movies/" -> "/Users/you/Movies"; the root folder keeps its slash
function trimTrailingSlash(folderPath: string): string {
  return folderPath.replace(/\/+$/, '') || '/';
}

export async function pickMacFolder(run: ProcessRunner): Promise<PickedFolder> {
  const result = await runPickerCommand(run, 'osascript', ['-e', PICKER_SCRIPT]);
  if (!result) throw new NotSupportedError("osascript isn't available, so the folder picker can't open. Type the folder path instead.");

  if (result.isTimedOut || CANCELLED_PATTERN.test(result.stderr)) return { path: null };
  if (result.exitCode !== 0) throw pickerFailed(result.stderr);

  const folderPath = result.stdout.trim();
  return { path: folderPath ? trimTrailingSlash(folderPath) : null };
}
