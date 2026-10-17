import { spawn } from 'node:child_process';

import { ToolNotInstalledError, UpstreamError, UpstreamTimeoutError } from '../../lib/errors.ts';
import { createLineSplitter, isRecord, parseJsonLine } from '../../lib/lineSplitter.ts';
import { createMessageQueue } from '../../lib/messageQueue.ts';
import { killProcessTree, TREE_SPAWN_OPTIONS } from '../../lib/processTree.ts';

export type HelperMessage = Record<string, unknown>;

// the helpers speak JSON lines over stdin and stdout; the docstring at the top of each script lists them
export interface PythonHelper {
  write(message: object): void;
  nextMessage(timeoutMs: number, timeoutMessage: string): Promise<HelperMessage>;
  kill(): void;
}

export function startPythonHelper(pythonCommand: string, scriptPath: string): PythonHelper {
  const child = spawn(pythonCommand, [scriptPath], {
    ...TREE_SPAWN_OPTIONS,
    // Windows defaults to cp1252, which crashes on non-Latin usernames and captions
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  const messages = createMessageQueue<HelperMessage>();

  child.stdout.on('data', createLineSplitter((line) => {
    const message = parseJsonLine(line);
    if (isRecord(message)) messages.push(message);
  }));
  // a full stderr pipe would block the helper, and its diagnostics are not needed
  child.stderr.resume();
  child.on('error', (error) => messages.end(new ToolNotInstalledError(`Couldn't start Python: ${error.message}`)));
  child.on('close', () => messages.end(new UpstreamError('The instaloader helper stopped without answering. Try again.')));

  return {
    write(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    },
    nextMessage(timeoutMs, timeoutMessage) {
      return messages.next(timeoutMs, () => {
        killProcessTree(child);
        return new UpstreamTimeoutError(timeoutMessage);
      });
    },
    kill: () => killProcessTree(child),
  };
}
