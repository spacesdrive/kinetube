import { canRun, runProcess } from '../../lib/runProcess.ts';

export interface PythonSetup {
  pythonCommand: string | null;
  hasInstaloader: boolean;
}

export interface PythonDetector {
  detect(): Promise<PythonSetup>;
  // drops a cached result, after pip installs instaloader
  forget(): void;
}

// importing instaloader loads requests and friends; a slow disk can take several seconds
const IMPORT_TIMEOUT_MS = 8_000;

function pythonCommands(platform: NodeJS.Platform): string[] {
  // macOS and most Linux distributions ship only python3; Windows installs python
  return platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
}

async function hasInstaloader(pythonCommand: string): Promise<boolean> {
  try {
    const args = ['-c', 'import instaloader; print("ok")'];
    const { exitCode, stdout } = await runProcess(pythonCommand, args, { timeoutMs: IMPORT_TIMEOUT_MS });
    return exitCode === 0 && stdout.trim() === 'ok';
  } catch {
    return false;
  }
}

export function createPythonDetector(platform: NodeJS.Platform = process.platform): PythonDetector {
  let cached: PythonSetup | null = null;

  async function detectNow(): Promise<PythonSetup> {
    for (const pythonCommand of pythonCommands(platform)) {
      if (!(await canRun(pythonCommand))) continue;
      return { pythonCommand, hasInstaloader: await hasInstaloader(pythonCommand) };
    }
    return { pythonCommand: null, hasInstaloader: false };
  }

  return {
    async detect() {
      // only a complete setup is cached, so installing Python or instaloader is noticed on the next check
      if (cached) return cached;
      const setup = await detectNow();
      if (setup.hasInstaloader) cached = setup;
      return setup;
    },
    forget() {
      cached = null;
    },
  };
}
