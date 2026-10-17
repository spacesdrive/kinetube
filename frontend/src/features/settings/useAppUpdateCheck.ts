import { useCallback, useEffect, useState } from 'react';

export type AppUpdateCheckState = 'idle' | 'checking' | 'upToDate' | 'devMode' | 'error';

export const APP_UPDATE_HINTS: Record<AppUpdateCheckState, string | undefined> = {
  idle: undefined,
  checking: undefined,
  upToDate: 'This is the newest version.',
  devMode: 'Update checks only run in the installed app.',
  error: "Couldn't check for updates. Try again later.",
};

// the app's own updater, run by Electron; a found update opens the update dialog instead of showing here
export function useAppUpdateCheck() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [state, setState] = useState<AppUpdateCheckState>('idle');
  const electronApi = window.electronAPI;

  useEffect(() => {
    electronApi?.getAppVersion().then(setAppVersion).catch(() => setAppVersion(null));
  }, [electronApi]);

  useEffect(() => {
    if (!electronApi) return;
    return electronApi.onUpdateStatus((status) => {
      if (status.type === 'checking') setState('checking');
      else if (status.type === 'not-available') setState('upToDate');
      else if (status.type === 'available') setState('idle');
      else if (status.type === 'error') setState('error');
    });
  }, [electronApi]);

  const check = useCallback(async () => {
    if (!electronApi) return;
    setState('checking');
    try {
      const result = await electronApi.checkForUpdates();
      if (result.isDevMode) setState('devMode');
    } catch {
      setState('error');
    }
  }, [electronApi]);

  return { appVersion, state, check };
}
