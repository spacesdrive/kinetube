import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';

// whisper.cpp is installed on first use, from the Transcribe page rather than the startup screen
export function useWhisperSetup() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [percent, setPercent] = useState(0);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getTool('whisper')
      .then(({ data }) => setIsInstalled(data.isInstalled))
      .catch((failure: unknown) => setError(`Couldn't check for whisper.cpp. ${(failure as Error).message}`));
  }, []);

  const install = useCallback(() => {
    setIsInstalling(true);
    setPercent(0);
    setPhaseMessage('Starting...');
    setError('');
    api.installTool('whisper', (...[event, data]) => {
      if (event === 'phase') setPhaseMessage(data.message);
      if (event === 'progress') setPercent(data.percent);
      if (event !== 'done') return;
      setIsInstalling(false);
      if (data.success) setIsInstalled(true);
      else setError(data.message);
    });
  }, []);

  return { isInstalled, isInstalling, percent, phaseMessage, error, install };
}
