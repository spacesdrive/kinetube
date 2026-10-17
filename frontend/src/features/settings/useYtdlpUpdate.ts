import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';

export type YtdlpUpdateState = 'idle' | 'checking' | 'upToDate' | 'available' | 'updating' | 'updated' | 'error';

// checks yt-dlp's own GitHub releases, separate from KineTube's updater (ADR-022)
export function useYtdlpUpdate() {
  const [version, setVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [state, setState] = useState<YtdlpUpdateState>('idle');
  const [error, setError] = useState('');
  const [percent, setPercent] = useState(0);

  const loadVersion = useCallback(() => {
    api.getTool('ytdlp').then(({ data }) => setVersion(data.version)).catch(() => setVersion(null));
  }, []);

  useEffect(loadVersion, [loadVersion]);

  const check = useCallback(async () => {
    setState('checking');
    setError('');
    try {
      const { data } = await api.getLatestYtdlpRelease();
      setVersion(data.currentVersion);
      setLatestVersion(data.latestVersion);
      setState(data.isUpdateAvailable ? 'available' : 'upToDate');
    } catch (failure) {
      setError(`Couldn't check for a yt-dlp update. ${(failure as Error).message}`);
      setState('error');
    }
  }, []);

  const update = useCallback(() => {
    setState('updating');
    setPercent(0);
    api.updateTool('ytdlp', (...[event, data]) => {
      if (event === 'progress') setPercent(data.percent);
      if (event !== 'done') return;
      if (data.success) {
        setState('updated');
        loadVersion();
        return;
      }
      setError(data.message);
      setState('error');
    });
  }, [loadVersion]);

  return { version, latestVersion, state, error, percent, check, update };
}

export type YtdlpUpdate = ReturnType<typeof useYtdlpUpdate>;
