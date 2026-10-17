import YtdlpAlert from '@/components/YtdlpAlert';
import BatchPanel from '@/features/batch/BatchPanel';
import DownloadSettingsPanel from '@/features/downloads/DownloadSettingsPanel';
import ResumeDownloadsBanner from '@/features/downloads/ResumeDownloadsBanner';
import { cn } from '@/lib/utils';
import DownloadHero from './download/DownloadHero';
import FeatureNotes from './download/FeatureNotes';
import MediaResult from './download/MediaResult';
import ProfileFetchProgress from './download/ProfileFetchProgress';
import UrlForm from './download/UrlForm';

import type { Download } from '@shared/downloads.ts';
import type { Tool } from '@shared/tools.ts';
import type { BatchState } from '@/features/batch/useBatch';
import type { MediaDownloadHandlers } from '@/features/downloads/downloadRequests';
import type { MediaLookup } from '@/hooks/useMediaLookup';
import type { DownloadPlatformPage } from '@/lib/pages';
import type { DownloadSettings } from '@/lib/settings';

export interface DownloadPageProps extends MediaDownloadHandlers {
  platform: DownloadPlatformPage;
  url: string;
  lookup: MediaLookup;
  batch: BatchState;
  isBatchMode: boolean;
  settings: DownloadSettings;
  ytdlp: Tool | null;
  isFfmpegInstalled: boolean;
  resumable: Download[];
  isDownloadActive: boolean;
  onUrlChange(url: string): void;
  onSubmit(): void;
  onClear(): void;
  onSettingsChange(settings: DownloadSettings): void;
  onSwitchToInstagram(): void;
  onOpenSettings(): void;
  onResume(download: Download): void;
  onDismissResume(download: Download): void;
}

// the YouTube and Instagram pages: a link field, its result, and batch mode as an alternative
export default function DownloadPage(props: DownloadPageProps) {
  const { platform, url, lookup, batch, isBatchMode, settings, ytdlp, isFfmpegInstalled, resumable, isDownloadActive } = props;
  const { found, isLoading, error, progress } = lookup;
  const showLanding = !found && !isBatchMode;

  return (
    <>
      {isBatchMode && <BatchPanel batch={batch} defaultQuality={settings.defaultQuality} onBulkDownload={props.onBulkDownload} />}
      {showLanding && <DownloadHero platform={platform} />}
      <div className="mx-auto mb-4 w-full max-w-3xl"><YtdlpAlert ytdlp={ytdlp} onOpenSettings={props.onOpenSettings} /></div>
      {!isDownloadActive && resumable.length > 0 && (
        <div className="mx-auto mb-4 w-full max-w-3xl">
          <ResumeDownloadsBanner downloads={resumable} onResume={props.onResume} onDismiss={props.onDismissResume} />
        </div>
      )}

      {!isBatchMode && (
        <div className={cn('mx-auto w-full max-w-3xl', found ? 'mb-4' : 'mb-0')}>
          <UrlForm platform={platform} url={url} error={error} isLoading={isLoading} onUrlChange={props.onUrlChange} onSubmit={props.onSubmit} onClear={props.onClear} onSwitchToInstagram={props.onSwitchToInstagram} />
          {error && <p className="mt-2 px-4 text-center text-sm font-medium text-red-500">{error}</p>}
          {isLoading && progress && <ProfileFetchProgress progress={progress} />}
        </div>
      )}
      {showLanding && (
        <div className="mx-auto mt-2 w-full max-w-3xl"><DownloadSettingsPanel settings={settings} onChange={props.onSettingsChange} /></div>
      )}
      {showLanding && !isLoading && <FeatureNotes />}
      {found && (
        <MediaResult found={found} defaultQuality={settings.defaultQuality} isFfmpegInstalled={isFfmpegInstalled} onDownload={props.onDownload} onBulkDownload={props.onBulkDownload} />
      )}
    </>
  );
}
