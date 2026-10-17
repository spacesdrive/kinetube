import YtdlpAlert from '@/components/YtdlpAlert';
import DownloadSettingsPanel from '@/features/downloads/DownloadSettingsPanel';
import ResumeDownloadsBanner from '@/features/downloads/ResumeDownloadsBanner';
import LandingHero from './download/LandingHero';
import MediaResult from './download/MediaResult';
import ProfileFetchProgress from './download/ProfileFetchProgress';
import QuickActions from './download/QuickActions';
import SupportedLinks from './download/SupportedLinks';
import UrlForm from './download/UrlForm';

import type { Download } from '@shared/downloads.ts';
import type { Tool } from '@shared/tools.ts';
import type { MediaDownloadHandlers } from '@/features/downloads/downloadRequests';
import type { MediaLookup } from '@/hooks/useMediaLookup';
import type { DownloadPlatformPage, Page } from '@/lib/pages';
import type { DownloadSettings } from '@/lib/settings';

export interface DownloadPageProps extends MediaDownloadHandlers {
  platform: DownloadPlatformPage;
  url: string;
  lookup: MediaLookup;
  settings: DownloadSettings;
  ytdlp: Tool | null;
  isFfmpegInstalled: boolean;
  resumable: Download[];
  isDownloadActive: boolean;
  onUrlChange(url: string): void;
  onSubmit(): void;
  onClear(): void;
  onSettingsChange(settings: DownloadSettings): void;
  onOpenLink(url: string): void;
  onPageChange(page: Page): void;
  onPasteLink(): void;
  onResume(download: Download): void;
  onDismissResume(download: Download): void;
}

// the YouTube and Instagram pages: a landing with the link field, then the result of the lookup
export default function DownloadPage(props: DownloadPageProps) {
  const { platform, url, lookup, settings, ytdlp, isFfmpegInstalled, resumable, isDownloadActive } = props;
  const { found, isLoading, error, progress } = lookup;
  const showsResume = !isDownloadActive && resumable.length > 0;

  const urlForm = (
    <UrlForm
      platform={platform}
      url={url}
      error={error}
      isLoading={isLoading}
      isCompact={Boolean(found)}
      onUrlChange={props.onUrlChange}
      onSubmit={props.onSubmit}
      onClear={props.onClear}
      onSwitchToInstagram={() => props.onPageChange('instagram')}
    />
  );

  if (found) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="mx-auto max-w-[var(--content-narrow)]">{urlForm}</div>
        <MediaResult found={found} defaultQuality={settings.defaultQuality} isFfmpegInstalled={isFfmpegInstalled} isRefreshing={isLoading} onDownload={props.onDownload} onBulkDownload={props.onBulkDownload} onOpenLink={props.onOpenLink} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[var(--content-narrow)] flex-col gap-8 pt-6">
      <LandingHero platform={platform} />
      <div className="space-y-4">
        {urlForm}
        {isLoading && progress && <ProfileFetchProgress progress={progress} />}
        <DownloadSettingsPanel settings={settings} onChange={props.onSettingsChange} />
      </div>
      <YtdlpAlert ytdlp={ytdlp} onOpenSettings={() => props.onPageChange('settings')} />
      {showsResume && <ResumeDownloadsBanner downloads={resumable} onResume={props.onResume} onDismiss={props.onDismissResume} />}
      {!isLoading && <QuickActions onPasteLink={props.onPasteLink} onPageChange={props.onPageChange} />}
      <SupportedLinks platform={platform} />
    </div>
  );
}
