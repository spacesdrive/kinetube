import os from 'node:os';

import { runProcess } from '../../lib/runProcess.ts';

export interface WhisperRunInput {
  binaryPath: string;
  modelPath: string;
  wavPath: string;
  language: string;
  signal?: AbortSignal;
  onPercent(percent: number): void;
  onText(text: string): void;
}

// a two hour recording on the large model takes about this long on a mid-range CPU
const TRANSCRIPTION_TIMEOUT_MS = 30 * 60 * 1000;

// whisper.cpp prints "whisper_print_progress_callback: progress =  45%" on stderr
const PROGRESS_PATTERN = /progress\s*=\s*(\d+)%/;

function threadCount(): number {
  // half the cores keeps the rest of the machine responsive while whisper runs
  return Math.max(1, Math.floor(os.cpus().length / 2));
}

function buildArgs({ modelPath, wavPath, language }: WhisperRunInput): string[] {
  const args = ['-m', modelPath, '-f', wavPath, '-t', String(threadCount()), '--no-timestamps', '--print-progress'];
  if (language !== 'auto') args.push('-l', language);
  return args;
}

// returns whisper's raw stdout; stderr carries only progress and diagnostics
export async function runWhisper(input: WhisperRunInput): Promise<string> {
  const { binaryPath, signal, onPercent, onText } = input;

  const result = await runProcess(binaryPath, buildArgs(input), {
    timeoutMs: TRANSCRIPTION_TIMEOUT_MS,
    signal,
    onStdout: (chunk) => {
      if (chunk.trim()) onText(chunk.trim());
    },
    onStderr: (chunk) => {
      const percentMatch = chunk.match(PROGRESS_PATTERN);
      if (percentMatch?.[1]) onPercent(Number(percentMatch[1]));
    },
  });

  if (result.isTimedOut) throw new Error('Transcription stopped after 30 minutes. Try a smaller model or a shorter file.');
  if (result.exitCode !== 0 && !result.stdout.trim()) {
    throw new Error(`whisper.cpp exited with code ${result.exitCode}: ${result.stderr.slice(-500)}`);
  }
  return result.stdout;
}
