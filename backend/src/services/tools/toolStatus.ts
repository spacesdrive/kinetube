import { YTDLP_VERSION } from '../../managers/ytdlp/ytdlpBinary.ts';
import { isNewerVersion } from '../../lib/versions.ts';

import type { Tool, ToolId } from '@shared/tools.ts';
import type { FfmpegManager } from '../../managers/ffmpeg/ffmpegManager.ts';
import type { InstaloaderManager } from '../../managers/instaloader/instaloaderManager.ts';
import type { WhisperManager } from '../../managers/whisper/whisperManager.ts';
import type { YtdlpManager } from '../../managers/ytdlp/ytdlpManager.ts';

export interface ToolManagers {
  ytdlp: YtdlpManager;
  ffmpeg: FfmpegManager;
  whisper: WhisperManager;
  instaloader: InstaloaderManager;
}

export const TOOL_IDS: readonly ToolId[] = ['ytdlp', 'ffmpeg', 'whisper', 'instaloader'];

export const TOOL_NAMES: Record<ToolId, string> = {
  ytdlp: 'yt-dlp',
  ffmpeg: 'FFmpeg',
  whisper: 'whisper.cpp',
  instaloader: 'instaloader',
};

function binaryTool(id: ToolId, isInstalled: boolean): Tool {
  return { id, name: TOOL_NAMES[id], isInstalled, version: null, requiredVersion: null, needsUpdate: false, missingRequirement: null };
}

export async function readToolStatus(toolId: ToolId, managers: ToolManagers): Promise<Tool> {
  if (toolId === 'ytdlp') {
    const version = await managers.ytdlp.readVersion();
    return {
      ...binaryTool('ytdlp', managers.ytdlp.isInstalled()),
      version,
      requiredVersion: YTDLP_VERSION,
      // only an older binary needs updating; one updated past the tested version is fine (ADR-022)
      needsUpdate: isNewerVersion(YTDLP_VERSION, version),
    };
  }
  if (toolId === 'ffmpeg') return binaryTool('ffmpeg', managers.ffmpeg.isInstalled());
  if (toolId === 'whisper') return binaryTool('whisper', managers.whisper.isInstalled());

  const { pythonCommand, hasInstaloader } = await managers.instaloader.checkSetup();
  return { ...binaryTool('instaloader', hasInstaloader), missingRequirement: pythonCommand ? null : 'python' };
}
