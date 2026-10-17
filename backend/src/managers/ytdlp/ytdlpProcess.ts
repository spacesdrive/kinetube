import { spawn } from 'node:child_process';

import { createLineSplitter } from '../../lib/lineSplitter.ts';
import { killProcessTree, TREE_SPAWN_OPTIONS } from '../../lib/processTree.ts';
import { parseYtdlpLine } from './ytdlpOutput.ts';

import type { YtdlpLine } from './ytdlpOutput.ts';

export interface YtdlpHandlers {
  onLine(line: YtdlpLine): void;
  onErrorOutput(text: string): void;
}

export interface YtdlpRun {
  stop(): void;
  // resolves with the exit code; rejects when yt-dlp could not be started at all
  finished: Promise<number | null>;
}

export function startYtdlp(binaryPath: string, args: string[], handlers: YtdlpHandlers): YtdlpRun {
  const child = spawn(binaryPath, args, TREE_SPAWN_OPTIONS);

  child.stdout?.on('data', createLineSplitter((line) => handlers.onLine(parseYtdlpLine(line))));
  child.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) handlers.onErrorOutput(text);
  });

  const finished = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  return { stop: () => killProcessTree(child), finished };
}
