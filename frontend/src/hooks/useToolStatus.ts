import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api';

import type { Tool } from '@shared/tools.ts';

export type StartupCheck = 'checking' | 'needsSetup' | 'ready';

interface ToolSnapshot {
  startupCheck: StartupCheck;
  ytdlp: Tool | null;
  ffmpeg: Tool | null;
}

// yt-dlp and FFmpeg decide whether the setup screen shows; the others install from their own pages
async function readTools(): Promise<ToolSnapshot> {
  try {
    const { data } = await api.listTools(['ytdlp', 'ffmpeg']);
    const ytdlp = data.find((tool) => tool.id === 'ytdlp') ?? null;
    const ffmpeg = data.find((tool) => tool.id === 'ffmpeg') ?? null;
    return { startupCheck: ytdlp?.isInstalled && ffmpeg?.isInstalled ? 'ready' : 'needsSetup', ytdlp, ffmpeg };
  } catch {
    // a backend that is still starting shows the app; a failing download then explains itself
    return { startupCheck: 'ready', ytdlp: null, ffmpeg: null };
  }
}

export function useToolStatus() {
  const [snapshot, setSnapshot] = useState<ToolSnapshot>({ startupCheck: 'checking', ytdlp: null, ffmpeg: null });

  useEffect(() => {
    let isCurrent = true;
    void readTools().then((next) => {
      if (isCurrent) setSnapshot(next);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setSnapshot(await readTools());
  }, []);

  const { startupCheck, ytdlp, ffmpeg } = snapshot;
  return { startupCheck, ytdlp, isFfmpegInstalled: ffmpeg?.isInstalled ?? false, refresh };
}
