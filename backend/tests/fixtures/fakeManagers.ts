import { renderTranscripts } from '../../src/managers/whisper/whisperFormats.ts';
import { parseYtdlpLine } from '../../src/managers/ytdlp/ytdlpOutput.ts';

import type { ProcessResult } from '../../src/lib/runProcess.ts';
import type { FfmpegManager } from '../../src/managers/ffmpeg/ffmpegManager.ts';
import type { InstaloaderManager } from '../../src/managers/instaloader/instaloaderManager.ts';
import type { WhisperManager } from '../../src/managers/whisper/whisperManager.ts';
import type { YtdlpHandlers } from '../../src/managers/ytdlp/ytdlpProcess.ts';
import type { YtdlpManager } from '../../src/managers/ytdlp/ytdlpManager.ts';
import type { ToolManagers } from '../../src/services/tools/toolStatus.ts';

export interface FakeDownloadRun {
  args: string[];
  isStopped: boolean;
  emit(line: string): void;
  emitError(text: string): void;
  exit(code: number | null): void;
}

export interface FakeMetadataCall {
  args: string[];
  timeoutMs: number;
}

export interface FakeYtdlp extends YtdlpManager {
  installed: boolean;
  metadata: ProcessResult;
  metadataCalls: FakeMetadataCall[];
  runs: FakeDownloadRun[];
}

// a yt-dlp that never runs: the test feeds it output lines and decides when and how it exits
export function createFakeYtdlp(): FakeYtdlp {
  const fake: FakeYtdlp = {
    installed: true,
    metadata: { exitCode: 0, stdout: '{}', stderr: '', isTimedOut: false },
    metadataCalls: [],
    runs: [],
    binaryPath: '/fake/yt-dlp',
    isInstalled: () => fake.installed,
    readVersion: async () => (fake.installed ? '2026.03.17' : null),
    install: async () => {},
    update: async () => '2026.09.01',
    fetchLatestVersion: async () => '2026.09.01',
    runMetadata: async (args, timeoutMs) => {
      fake.metadataCalls.push({ args, timeoutMs });
      return fake.metadata;
    },
    startDownload(args: string[], handlers: YtdlpHandlers) {
      let resolveExit: (code: number | null) => void = () => {};
      const finished = new Promise<number | null>((resolve) => {
        resolveExit = resolve;
      });
      const run: FakeDownloadRun = {
        args,
        isStopped: false,
        emit: (line) => handlers.onLine(parseYtdlpLine(line)),
        emitError: (text) => handlers.onErrorOutput(text),
        exit: (code) => resolveExit(code),
      };
      fake.runs.push(run);
      return {
        finished,
        stop: () => {
          run.isStopped = true;
          resolveExit(null);
        },
      };
    },
  };
  return fake;
}

export function createFakeFfmpeg(isInstalled = true): FfmpegManager {
  return {
    binaryPath: '/fake/ffmpeg',
    binaryDir: '/fake',
    isInstalled: () => isInstalled,
    install: async () => {},
    extractAudio: async () => {},
  };
}

export function createFakeWhisper(): WhisperManager {
  return {
    isInstalled: () => true,
    install: async () => {},
    listModels: () => [{ id: 'base', label: 'Base (~142 MB)', sizeMb: 142, isDownloaded: true }],
    isModelDownloaded: (modelId) => modelId === 'base',
    downloadModel: async () => {},
    // names the files it would write, so a test can see which formats reached the manager
    transcribe: async ({ inputPath, formats }) => ({
      text: 'hello there',
      transcripts: renderTranscripts([{ startMs: 0, endMs: 1500, text: 'hello there' }], 'hello there'),
      outputPaths: formats.map((format) => inputPath.replace(/\.[^.]+$/, `.${format}`)),
    }),
  };
}

export function createFakeInstaloader(): InstaloaderManager {
  return {
    checkSetup: async () => ({ pythonCommand: 'python', hasInstaloader: true }),
    install: async () => {},
    startHelper: async () => {
      throw new Error('the fake instaloader has no helper scripts');
    },
  };
}

export function createFakeManagers(ytdlp: FakeYtdlp = createFakeYtdlp()): ToolManagers & { ytdlp: FakeYtdlp } {
  return { ytdlp, ffmpeg: createFakeFfmpeg(), whisper: createFakeWhisper(), instaloader: createFakeInstaloader() };
}
