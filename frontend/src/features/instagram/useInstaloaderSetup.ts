import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';

export type InstaloaderStatus = 'checking' | 'missingPython' | 'needsInstall' | 'installing' | 'installFailed' | 'ready';

interface SetupReading {
  status: InstaloaderStatus;
  failure: string;
}

async function readStatus(): Promise<SetupReading> {
  try {
    const { data: tool } = await api.getTool('instaloader');
    if (tool.isInstalled) return { status: 'ready', failure: '' };
    return { status: tool.missingRequirement === 'python' ? 'missingPython' : 'needsInstall', failure: '' };
  } catch (error) {
    return { status: 'installFailed', failure: `Couldn't check for instaloader. ${(error as Error).message}` };
  }
}

// Instagram login runs through the instaloader pip package, so Python and instaloader come first
export function useInstaloaderSetup() {
  const [reading, setReading] = useState<SetupReading>({ status: 'checking', failure: '' });
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    let isCurrent = true;
    void readStatus().then((next) => {
      if (isCurrent) setReading(next);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const check = useCallback(async () => {
    setReading({ status: 'checking', failure: '' });
    setReading(await readStatus());
  }, []);

  const install = useCallback(() => {
    setReading({ status: 'installing', failure: '' });
    setLogLines([]);
    api.installTool('instaloader', (...[event, data]) => {
      if (event === 'log') setLogLines((previous) => [...previous, data.message]);
      if (event !== 'done') return;
      setReading(data.success ? { status: 'ready', failure: '' } : { status: 'installFailed', failure: data.message });
    });
  }, []);

  return { status: reading.status, failure: reading.failure, logLines, check, install };
}
