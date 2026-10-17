import fs from 'node:fs';

import { backendLogPath } from './appPaths';

let logStream: fs.WriteStream | null = null;

// rewritten on every start, so the file always holds the latest run when someone reports a problem
export function openBackendLog(): void {
  logStream = fs.createWriteStream(backendLogPath(), { flags: 'w' });
}

export function writeLog(line: string): void {
  logStream?.write(line);
  process.stdout.write(line);
}

export function readBackendLog(): string {
  const logPath = backendLogPath();
  return fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '(the log is empty)';
}
