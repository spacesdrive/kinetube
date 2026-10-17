import { spawn } from 'node:child_process';

import { killProcessTree, TREE_SPAWN_OPTIONS } from './processTree.ts';

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  isTimedOut: boolean;
}

export interface RunProcessOptions {
  timeoutMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

// runs a command to completion and collects its output; rejects only when the command cannot start at all
export function runProcess(command: string, args: string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
  const { timeoutMs, cwd, env, signal, onStdout, onStderr } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...TREE_SPAWN_OPTIONS, cwd, env });
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const timer = timeoutMs
      ? setTimeout(() => {
          isTimedOut = true;
          killProcessTree(child);
        }, timeoutMs)
      : null;
    const handleAbort = (): void => killProcessTree(child);
    signal?.addEventListener('abort', handleAbort, { once: true });

    const cleanUp = (): void => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      onStdout?.(chunk.toString());
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      onStderr?.(chunk.toString());
    });
    child.on('error', (error) => {
      cleanUp();
      reject(error);
    });
    child.on('close', (exitCode) => {
      cleanUp();
      resolve({ exitCode, stdout, stderr, isTimedOut });
    });
  });
}

// lets a caller take runProcess as a dependency, so a test can pass a fake
export type ProcessRunner = typeof runProcess;

// a cold Python start on Windows can take a few seconds; anything slower counts as missing
const PROBE_TIMEOUT_MS = 8_000;

// true when the command exists and answers --version, used to find git, cmake and python
export async function canRun(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    const { exitCode } = await runProcess(command, args, { timeoutMs: PROBE_TIMEOUT_MS });
    return exitCode === 0;
  } catch {
    return false;
  }
}
