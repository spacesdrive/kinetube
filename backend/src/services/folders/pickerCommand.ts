import { UpstreamError } from '../../lib/errors.ts';

import type { ProcessResult, ProcessRunner } from '../../lib/runProcess.ts';

export const PICKER_TITLE = 'Select Download Folder';

// a person may leave the dialog open a while, but not forever
const PICKER_TIMEOUT_MS = 2 * 60_000;

// null when the command is not installed, so the caller can try another one or say what to install
export async function runPickerCommand(run: ProcessRunner, command: string, args: string[]): Promise<ProcessResult | null> {
  try {
    return await run(command, args, { timeoutMs: PICKER_TIMEOUT_MS });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function pickerFailed(stderr: string): UpstreamError {
  const reason = stderr.trim().split('\n').at(-1)?.trim() || 'It gave no reason.';
  return new UpstreamError(`Couldn't use the folder picker. ${reason} Type the folder path instead.`);
}
