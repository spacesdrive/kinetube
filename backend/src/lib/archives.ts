import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import unzipper from 'unzipper';

import { runProcess } from './runProcess.ts';

// streams a zip and writes every entry the picker accepts; returns how many entries were written
export async function extractFromZip(
  zipPath: string,
  pickDestination: (entryPath: string) => string | null,
): Promise<number> {
  let writtenCount = 0;
  const writes: Promise<void>[] = [];

  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Parse())
    .on('entry', (entry: unzipper.Entry) => {
      const destination = pickDestination(entry.path);
      if (!destination) {
        entry.autodrain();
        return;
      }
      writtenCount++;
      writes.push(pipeline(entry, fs.createWriteStream(destination)));
    })
    .promise();

  await Promise.all(writes);
  return writtenCount;
}

function findFileByName(dir: string, fileName: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) return fullPath;
    if (!entry.isDirectory()) continue;

    const found = findFileByName(fullPath, fileName);
    if (found) return found;
  }
  return null;
}

// unpacks a .tar.xz with the system tar and copies one file out of it; returns false when it is not inside
export async function extractFileFromTarXz(archivePath: string, fileName: string, destination: string): Promise<boolean> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-archive-'));

  try {
    const result = await runProcess('tar', ['-xJf', archivePath, '-C', tempDir]).catch((error: unknown) => {
      throw new Error(`Couldn't run "tar" (${(error as Error).message}). Install tar and xz-utils, then try again.`);
    });
    if (result.exitCode !== 0) throw new Error(`tar exited with code ${result.exitCode}: ${result.stderr.slice(-300)}`);

    const extractedPath = findFileByName(tempDir, fileName);
    if (!extractedPath) return false;
    fs.copyFileSync(extractedPath, destination);
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
