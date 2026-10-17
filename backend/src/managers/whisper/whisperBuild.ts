import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { markExecutable } from '../../lib/executable.ts';
import { canRun, runProcess } from '../../lib/runProcess.ts';
import { WHISPER_REPO_URL, WHISPER_VERSION } from './whisperBinary.ts';

import type { ToolPhase } from '@shared/tools.ts';
import type { ToolEventSink } from '../toolEvents.ts';

interface BuildStep {
  phase: ToolPhase;
  message: string;
  command: string;
  args: string[];
}

function buildSteps(sourceDir: string): BuildStep[] {
  return [
    {
      phase: 'cloning',
      message: 'Downloading the whisper.cpp source...',
      command: 'git',
      args: ['clone', '--depth', '1', '--branch', `v${WHISPER_VERSION}`, WHISPER_REPO_URL, sourceDir],
    },
    { phase: 'configuring', message: 'Configuring the build...', command: 'cmake', args: ['-B', 'build', '-S', '.'] },
    {
      phase: 'building',
      message: 'Compiling whisper.cpp. This can take several minutes...',
      command: 'cmake',
      args: ['--build', 'build', '--config', 'Release', '-j'],
    },
  ];
}

async function requireBuildTools(): Promise<void> {
  const [hasGit, hasCmake] = await Promise.all([canRun('git'), canRun('cmake')]);
  const missing = [hasGit ? null : 'git', hasCmake ? null : 'cmake'].filter((name) => name !== null);
  if (missing.length === 0) return;

  const names = missing.join(' and ');
  throw new Error(
    `Building whisper.cpp needs ${names}. Install ${names} (run "xcode-select --install" on macOS, or ` +
      '"sudo apt install git cmake build-essential" on Debian and Ubuntu), then try again.',
  );
}

async function runStep(step: BuildStep, cwd: string, send: ToolEventSink): Promise<void> {
  send('phase', { toolId: 'whisper', phase: step.phase, message: step.message, isSkipped: false });
  const onOutput = (chunk: string): void => send('log', { message: chunk.trim(), level: 'info' });
  const { exitCode } = await runProcess(step.command, step.args, { cwd, onStdout: onOutput, onStderr: onOutput });
  if (exitCode !== 0) throw new Error(`${step.command} ${step.args.join(' ')} exited with code ${exitCode}`);
}

function copyBuildOutput(sourceDir: string, downloadsDir: string): void {
  const binDirs = ['build/bin', 'build/bin/Release', 'build'].map((dir) => path.join(sourceDir, dir));
  const binDir = binDirs.find((dir) => fs.existsSync(path.join(dir, 'whisper-cli')));
  if (!binDir) throw new Error("The build didn't produce whisper-cli. Check the build output above for compiler errors.");

  const binaryPath = path.join(downloadsDir, 'whisper-cli');
  fs.copyFileSync(path.join(binDir, 'whisper-cli'), binaryPath);
  markExecutable(binaryPath);

  // whisper-cli is linked against the shared libraries built beside it
  for (const fileName of fs.readdirSync(binDir)) {
    if (/\.(so|dylib)(\.\d+)*$/.test(fileName)) fs.copyFileSync(path.join(binDir, fileName), path.join(downloadsDir, fileName));
  }
}

// macOS and Linux have no official prebuilt binary, so whisper.cpp is compiled from source (ADR-012)
export async function buildWhisperFromSource(downloadsDir: string, send: ToolEventSink): Promise<void> {
  await requireBuildTools();
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-whisper-src-'));

  try {
    const [cloneStep, ...compileSteps] = buildSteps(sourceDir);
    if (cloneStep) await runStep(cloneStep, os.tmpdir(), send);
    for (const step of compileSteps) await runStep(step, sourceDir, send);
    copyBuildOutput(sourceDir, downloadsDir);
  } finally {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
}
