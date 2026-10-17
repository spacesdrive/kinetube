import fs from 'node:fs';
import path from 'node:path';

import { markExecutable } from '../../lib/executable.ts';
import { downloadFileWithProgress } from '../../lib/httpDownload.ts';
import { runProcess } from '../../lib/runProcess.ts';
import { ytdlpBinaryName, ytdlpDownloadUrl } from './ytdlpBinary.ts';
import { startYtdlp } from './ytdlpProcess.ts';
import { fetchLatestYtdlpTag } from './ytdlpRelease.ts';

import type { ProcessResult } from '../../lib/runProcess.ts';
import type { ToolEventSink } from '../toolEvents.ts';
import type { YtdlpHandlers, YtdlpRun } from './ytdlpProcess.ts';

export interface YtdlpManager {
  binaryPath: string;
  isInstalled(): boolean;
  readVersion(): Promise<string | null>;
  install(send: ToolEventSink): Promise<void>;
  // downloads the newest release over the installed one and returns its version
  update(send: ToolEventSink): Promise<string>;
  fetchLatestVersion(): Promise<string | null>;
  runMetadata(args: string[], timeoutMs: number): Promise<ProcessResult>;
  startDownload(args: string[], handlers: YtdlpHandlers): YtdlpRun;
}

// --version answers instantly; a hung binary should not hold up the tools list
const VERSION_TIMEOUT_MS = 15_000;

export function createYtdlpManager(downloadsDir: string, platform: NodeJS.Platform = process.platform): YtdlpManager {
  const binaryName = ytdlpBinaryName(platform);
  const binaryPath = path.join(downloadsDir, binaryName);

  async function downloadRelease(version: string | undefined, send: ToolEventSink): Promise<void> {
    // a failed update must leave the working binary in place, so the new one is swapped in only when complete
    const partialPath = `${binaryPath}.download`;

    send('phase', { toolId: 'ytdlp', phase: 'downloading', message: `Downloading ${binaryName}...`, isSkipped: false });
    await downloadFileWithProgress(ytdlpDownloadUrl(platform, version), partialPath, (progress) => {
      send('progress', { toolId: 'ytdlp', ...progress });
    });
    fs.renameSync(partialPath, binaryPath);
    markExecutable(binaryPath, platform);
  }

  return {
    binaryPath,
    isInstalled: () => fs.existsSync(binaryPath),

    async readVersion() {
      if (!fs.existsSync(binaryPath)) return null;
      const { exitCode, stdout } = await runProcess(binaryPath, ['--version'], { timeoutMs: VERSION_TIMEOUT_MS });
      return exitCode === 0 ? stdout.trim() || null : null;
    },

    async install(send) {
      if (fs.existsSync(binaryPath)) {
        send('phase', { toolId: 'ytdlp', phase: 'done', message: `${binaryName} is already installed`, isSkipped: true });
        return;
      }
      await downloadRelease(undefined, send);
      send('phase', { toolId: 'ytdlp', phase: 'done', message: `${binaryName} installed`, isSkipped: false });
    },

    async update(send) {
      const latestVersion = await fetchLatestYtdlpTag();
      if (!latestVersion) throw new Error("Couldn't reach GitHub to find the latest yt-dlp release. Check your connection and try again.");

      await downloadRelease(latestVersion, send);
      send('phase', { toolId: 'ytdlp', phase: 'done', message: `Updated to yt-dlp ${latestVersion}`, isSkipped: false });
      return latestVersion;
    },

    fetchLatestVersion: () => fetchLatestYtdlpTag(),
    runMetadata: (args, timeoutMs) => runProcess(binaryPath, args, { timeoutMs }),
    startDownload: (args, handlers) => startYtdlp(binaryPath, args, handlers),
  };
}
