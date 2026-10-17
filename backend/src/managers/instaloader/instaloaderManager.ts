import path from 'node:path';

import { ToolNotInstalledError } from '../../lib/errors.ts';
import { runProcess } from '../../lib/runProcess.ts';
import { startPythonHelper } from './pythonHelper.ts';

import type { ToolEventSink } from '../toolEvents.ts';
import type { PythonDetector, PythonSetup } from './pythonDetector.ts';
import type { PythonHelper } from './pythonHelper.ts';

export type HelperScript = 'login' | 'profile';

const SCRIPT_FILES: Record<HelperScript, string> = {
  login: 'instaloader_login.py',
  profile: 'instaloader_profile.py',
};

export interface InstaloaderManager {
  checkSetup(): Promise<PythonSetup>;
  install(send: ToolEventSink): Promise<void>;
  // throws ToolNotInstalledError with what to do when Python or instaloader is missing
  startHelper(script: HelperScript): Promise<PythonHelper>;
}

export interface InstaloaderDeps {
  pythonDir: string;
  detector: PythonDetector;
}

const MISSING_PYTHON_MESSAGE = "Python isn't installed. Install Python 3 from python.org, then try again.";

export function createInstaloaderManager({ pythonDir, detector }: InstaloaderDeps): InstaloaderManager {
  async function pipInstall(pythonCommand: string, send: ToolEventSink): Promise<void> {
    send('phase', { toolId: 'instaloader', phase: 'installing', message: 'Running pip install instaloader...', isSkipped: false });
    const onOutput = (chunk: string): void => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.trim()) send('log', { message: line.trim(), level: 'info' });
      }
    };
    const args = ['-m', 'pip', 'install', 'instaloader'];
    const { exitCode } = await runProcess(pythonCommand, args, { onStdout: onOutput, onStderr: onOutput });
    if (exitCode !== 0) throw new Error('pip couldn\'t install instaloader. Run "pip install instaloader" in a terminal to see why.');
  }

  return {
    checkSetup: () => detector.detect(),

    async install(send) {
      const { pythonCommand, hasInstaloader } = await detector.detect();
      if (!pythonCommand) throw new Error(MISSING_PYTHON_MESSAGE);
      if (hasInstaloader) {
        send('phase', { toolId: 'instaloader', phase: 'done', message: 'instaloader is already installed', isSkipped: true });
        return;
      }

      await pipInstall(pythonCommand, send);
      detector.forget();
      send('phase', { toolId: 'instaloader', phase: 'done', message: 'instaloader installed', isSkipped: false });
    },

    async startHelper(script) {
      const { pythonCommand, hasInstaloader } = await detector.detect();
      if (!pythonCommand) throw new ToolNotInstalledError(MISSING_PYTHON_MESSAGE);
      if (!hasInstaloader) {
        throw new ToolNotInstalledError('instaloader isn\'t installed. Open "Add account" in the Instagram tab to install it.');
      }
      return startPythonHelper(pythonCommand, path.join(pythonDir, SCRIPT_FILES[script]));
    },
  };
}
