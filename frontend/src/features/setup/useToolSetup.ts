import { useEffect, useRef, useState } from 'react';

import { api } from '@/services/api';
import { applyToolEvent, WAITING_TOOL } from './toolSetupState';

import type { SetupToolId, ToolSetupState } from './toolSetupState';

const SETUP_ORDER: readonly SetupToolId[] = ['ytdlp', 'ffmpeg'];

// installs yt-dlp, then FFmpeg; a tool that is already there is reported as done right away
export function useToolSetup() {
  const [tools, setTools] = useState<Record<SetupToolId, ToolSetupState>>({ ytdlp: WAITING_TOOL, ffmpeg: WAITING_TOOL });
  const [isFinished, setIsFinished] = useState(false);
  // StrictMode mounts twice in development; a second install request would only get a 409
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    async function installAll() {
      for (const toolId of SETUP_ORDER) {
        const stream = api.installTool(toolId, (...event) => {
          setTools((previous) => ({ ...previous, [toolId]: applyToolEvent(previous[toolId], ...event) }));
        });
        await stream.finished;
      }
      setIsFinished(true);
    }
    void installAll();
  }, []);

  const hasError = Object.values(tools).some((tool) => tool.phase === 'error');
  const isAllDone = Object.values(tools).every((tool) => tool.phase === 'done');

  return { tools, isFinished, hasError, isAllDone };
}
