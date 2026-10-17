import { DEFAULT_SETTINGS, toDownloadSettings } from '@/lib/settings';
import DownloadPage from '@/pages/DownloadPage';
import { ignore } from './ignore';

import type { FoundMedia } from '@/features/batch/batchResults';
import type { MediaLookup } from '@/hooks/useMediaLookup';

const SETTINGS = toDownloadSettings(DEFAULT_SETTINGS.downloads);

export interface DemoDownloadPageProps {
  found: FoundMedia;
}

// the real download page after a lookup has finished, so the link field sits above the result as in the app
export default function DemoDownloadPage({ found }: DemoDownloadPageProps) {
  const lookup: MediaLookup = { found, isLoading: false, error: '', progress: null, lookUp: async () => null, clear: ignore, setError: ignore };

  return (
    <DownloadPage
      platform={found.platform}
      url={found.media.url}
      lookup={lookup}
      settings={SETTINGS}
      ytdlp={null}
      isFfmpegInstalled
      resumable={[]}
      isDownloadActive={false}
      onUrlChange={ignore}
      onSubmit={ignore}
      onClear={ignore}
      onSettingsChange={ignore}
      onOpenLink={ignore}
      onPageChange={ignore}
      onPasteLink={ignore}
      onResume={ignore}
      onDismissResume={ignore}
      onDownload={ignore}
      onBulkDownload={ignore}
    />
  );
}
