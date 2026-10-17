import fs from 'node:fs';

// a missing or corrupt file reads as empty: it only holds state the app can rebuild
export function readJsonArray(filePath: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// write then rename, so a crash mid-write never leaves half a file behind
export function writeJsonAtomic(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}
