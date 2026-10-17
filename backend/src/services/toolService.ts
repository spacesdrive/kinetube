import { errorMessage, ToolNotInstalledError, UpstreamError, ValidationError } from '../lib/errors.ts';
import { createKeyedLock } from '../lib/keyedLock.ts';
import { isNewerVersion } from '../lib/versions.ts';
import { ytdlpReleaseUrl } from '../managers/ytdlp/ytdlpBinary.ts';
import { readToolStatus, TOOL_IDS, TOOL_NAMES } from './tools/toolStatus.ts';

import type { Tool, ToolId, ToolInstallEvents, YtdlpRelease } from '@shared/tools.ts';
import type { ToolEventSink } from '../managers/toolEvents.ts';
import type { StreamJob } from './streamJob.ts';
import type { ToolManagers } from './tools/toolStatus.ts';

export interface ToolService {
  list(toolIds?: readonly ToolId[]): Promise<Tool[]>;
  get(toolId: ToolId): Promise<Tool>;
  install(toolId: ToolId): StreamJob<ToolInstallEvents>;
  update(toolId: ToolId): StreamJob<ToolInstallEvents>;
  latestYtdlpRelease(): Promise<YtdlpRelease>;
}

type ToolWork = (send: ToolEventSink) => Promise<unknown>;

export function createToolService(managers: ToolManagers): ToolService {
  const lock = createKeyedLock();

  const installers: Record<ToolId, ToolWork> = {
    ytdlp: (send) => managers.ytdlp.install(send),
    ffmpeg: (send) => managers.ffmpeg.install(send),
    whisper: (send) => managers.whisper.install(send),
    instaloader: (send) => managers.instaloader.install(send),
  };

  // the lock is taken before the stream opens, so a second request gets a plain 409 instead of a stream
  function runLocked(toolId: ToolId, action: 'install' | 'update', work: ToolWork): StreamJob<ToolInstallEvents> {
    const name = TOOL_NAMES[toolId];
    lock.claim(toolId, `${name} is already being set up. Wait for it to finish.`);

    // closing the stream does not stop the work: a reconnect then finds the tool ready
    return async (send) => {
      try {
        await work(send);
        const tool = await readToolStatus(toolId, managers);
        send('done', { success: true, message: `${name} is ready`, tool });
      } catch (error) {
        send('phase', { toolId, phase: 'error', message: errorMessage(error), isSkipped: false });
        send('done', { success: false, code: 'UPSTREAM_FAILED', message: `Couldn't ${action} ${name}. ${errorMessage(error)}` });
      } finally {
        lock.release(toolId);
      }
    };
  }

  return {
    list: (toolIds = TOOL_IDS) => Promise.all(toolIds.map((toolId) => readToolStatus(toolId, managers))),
    get: (toolId) => readToolStatus(toolId, managers),
    install: (toolId) => runLocked(toolId, 'install', installers[toolId]),

    update(toolId) {
      if (toolId !== 'ytdlp') throw new ValidationError(`Only yt-dlp can be updated in place. ${TOOL_NAMES[toolId]} is installed once.`);
      if (!managers.ytdlp.isInstalled()) throw new ToolNotInstalledError('yt-dlp is not installed yet. Finish setup first.');
      return runLocked('ytdlp', 'update', (send) => managers.ytdlp.update(send));
    },

    async latestYtdlpRelease() {
      if (!managers.ytdlp.isInstalled()) throw new ToolNotInstalledError('yt-dlp is not installed yet. Finish setup first.');

      const [currentVersion, latestVersion] = await Promise.all([managers.ytdlp.readVersion(), managers.ytdlp.fetchLatestVersion()]);
      if (!currentVersion) throw new UpstreamError("Couldn't read the installed yt-dlp version. Reinstall it from Settings.");
      if (!latestVersion) {
        throw new UpstreamError("Couldn't reach GitHub to check for a newer yt-dlp release. Check your connection and try again.");
      }

      return {
        currentVersion,
        latestVersion,
        isUpdateAvailable: isNewerVersion(latestVersion, currentVersion),
        releaseUrl: ytdlpReleaseUrl(latestVersion),
      };
    },
  };
}
