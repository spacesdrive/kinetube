import fs from 'node:fs';
import path from 'node:path';

import { extractFromZip } from '../../lib/archives.ts';
import { downloadFileWithProgress } from '../../lib/httpDownload.ts';
import { WHISPER_WINDOWS_ZIP_URL } from './whisperBinary.ts';

import type { ToolEventSink } from '../toolEvents.ts';

// the Windows build: whisper-cli.exe needs the DLLs that ship beside it in the same zip
export async function installWhisperFromZip(downloadsDir: string, send: ToolEventSink): Promise<void> {
  const zipPath = path.join(downloadsDir, 'whisper-setup.zip');

  try {
    send('phase', { toolId: 'whisper', phase: 'downloading', message: 'Downloading whisper.cpp...', isSkipped: false });
    await downloadFileWithProgress(WHISPER_WINDOWS_ZIP_URL, zipPath, (progress) => {
      send('progress', { toolId: 'whisper', ...progress });
    });

    send('phase', { toolId: 'whisper', phase: 'extracting', message: 'Extracting whisper.cpp...', isSkipped: false });
    await extractFromZip(zipPath, (entryPath) => {
      const fileName = path.basename(entryPath);
      return /\.(exe|dll)$/i.test(fileName) ? path.join(downloadsDir, fileName) : null;
    });
  } finally {
    fs.rmSync(zipPath, { force: true });
  }
}
