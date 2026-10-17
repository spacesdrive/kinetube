import { NotSupportedError } from '../../lib/errors.ts';
import { PICKER_TITLE, runPickerCommand } from './pickerCommand.ts';

import type { PickedFolder } from '@shared/folders.ts';
import type { ProcessRunner } from '../../lib/runProcess.ts';

const PICKER_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '${PICKER_TITLE}'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }
`.trim();

// the dialog prints the chosen folder, and nothing when it is closed
export async function pickWindowsFolder(run: ProcessRunner): Promise<PickedFolder> {
  // -EncodedCommand takes UTF-16LE base64, so the script's quotes can never be misread
  const encodedScript = Buffer.from(PICKER_SCRIPT, 'utf16le').toString('base64');
  const args = ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encodedScript];

  const result = await runPickerCommand(run, 'powershell', args);
  if (!result) throw new NotSupportedError("PowerShell isn't available, so the folder picker can't open. Type the folder path instead.");
  return { path: result.stdout.trim() || null };
}
