import { createAppPaths, ensureAppDirs } from './lib/paths.ts';
import { createFfmpegManager } from './managers/ffmpeg/ffmpegManager.ts';
import { createInstaloaderManager } from './managers/instaloader/instaloaderManager.ts';
import { createPythonDetector } from './managers/instaloader/pythonDetector.ts';
import { createWhisperManager } from './managers/whisper/whisperManager.ts';
import { createYtdlpManager } from './managers/ytdlp/ytdlpManager.ts';
import { createDownloadBatchService } from './services/downloadBatchService.ts';
import { createDownloadService } from './services/downloadService.ts';
import { createFolderService } from './services/folderService.ts';
import { createImageProxyService } from './services/imageProxyService.ts';
import { createInstagramAccountService } from './services/instagramAccountService.ts';
import { createInstagramMediaService } from './services/instagramMediaService.ts';
import { createToolService } from './services/toolService.ts';
import { createTranscriptionService } from './services/transcriptionService.ts';
import { createWhisperModelService } from './services/whisperModelService.ts';
import { createYouTubeMediaService } from './services/youtubeMediaService.ts';
import { createInstagramAccountStore } from './stores/instagramAccountStore.ts';
import { createPendingDownloadStore } from './stores/pendingDownloadStore.ts';

import type { AppConfig } from './config.ts';
import type { AppPaths } from './lib/paths.ts';
import type { DownloadBatchService } from './services/downloadBatchService.ts';
import type { DownloadService } from './services/downloadService.ts';
import type { FolderService } from './services/folderService.ts';
import type { ImageProxyService } from './services/imageProxyService.ts';
import type { InstagramAccountService } from './services/instagramAccountService.ts';
import type { InstagramMediaService } from './services/instagramMediaService.ts';
import type { ToolService } from './services/toolService.ts';
import type { ToolManagers } from './services/tools/toolStatus.ts';
import type { TranscriptionService } from './services/transcriptionService.ts';
import type { WhisperModelService } from './services/whisperModelService.ts';
import type { YouTubeMediaService } from './services/youtubeMediaService.ts';

export interface Services {
  tools: ToolService;
  youtubeMedia: YouTubeMediaService;
  instagramMedia: InstagramMediaService;
  instagramAccounts: InstagramAccountService;
  downloads: DownloadService;
  downloadBatches: DownloadBatchService;
  whisperModels: WhisperModelService;
  transcriptions: TranscriptionService;
  folders: FolderService;
  images: ImageProxyService;
}

export interface Container {
  paths: AppPaths;
  managers: ToolManagers;
  services: Services;
}

// built once at startup: running downloads, logins and installs live in these services for the process lifetime
export function createServices(managers: ToolManagers, paths: AppPaths): Services {
  const { ytdlp, ffmpeg, whisper, instaloader } = managers;
  const accounts = createInstagramAccountStore(paths);
  const environment = { ffmpeg, defaultDir: paths.downloadsDir };

  return {
    tools: createToolService(managers),
    youtubeMedia: createYouTubeMediaService(ytdlp),
    instagramMedia: createInstagramMediaService({ ytdlp, ffmpeg, instaloader, accounts, sessionsDir: paths.sessionsDir }),
    instagramAccounts: createInstagramAccountService({ accounts, instaloader, sessionsDir: paths.sessionsDir }),
    downloads: createDownloadService({ ytdlp, store: createPendingDownloadStore(paths.pendingDownloadsFile), environment }),
    downloadBatches: createDownloadBatchService({ ytdlp, whisper, environment }),
    whisperModels: createWhisperModelService(whisper),
    transcriptions: createTranscriptionService(whisper),
    folders: createFolderService(),
    images: createImageProxyService(),
  };
}

export function createContainer(config: AppConfig): Container {
  const paths = createAppPaths(config.dataDir);
  ensureAppDirs(paths);

  const ffmpeg = createFfmpegManager(paths.downloadsDir);
  const managers: ToolManagers = {
    ytdlp: createYtdlpManager(paths.downloadsDir),
    ffmpeg,
    whisper: createWhisperManager({ downloadsDir: paths.downloadsDir, modelsDir: paths.modelsDir, ffmpeg }),
    instaloader: createInstaloaderManager({ pythonDir: config.pythonDir, detector: createPythonDetector() }),
  };

  return { paths, managers, services: createServices(managers, paths) };
}
