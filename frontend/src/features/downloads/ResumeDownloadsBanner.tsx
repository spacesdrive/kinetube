import { RotateCcw, X } from 'lucide-react';

import ListRow from '@/components/patterns/ListRow';
import SectionHeader from '@/components/patterns/SectionHeader';
import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';

import type { Download } from '@shared/downloads.ts';

export interface ResumeDownloadsBannerProps {
  downloads: Download[];
  onResume(download: Download): void;
  onDismiss(download: Download): void;
}

function bannerTitle(count: number): string {
  return count === 1 ? 'Resume the unfinished download?' : `Resume ${count} unfinished downloads?`;
}

// yt-dlp continues a partial file when it gets the same request again, which the backend has saved
export default function ResumeDownloadsBanner({ downloads, onResume, onDismiss }: ResumeDownloadsBannerProps) {
  if (downloads.length === 0) return null;

  return (
    <section className="rounded-card bg-surface p-5">
      <SectionHeader title={bannerTitle(downloads.length)} description="These stopped before they finished. yt-dlp picks up where it left off." />
      <ul className="-mx-2 mt-3 space-y-0.5">
        {downloads.map((download) => (
          <ListRow
            key={download.id}
            title={<span title={download.title || download.url}>{download.title || download.url}</span>}
            meta={<StatusBadge tone={download.status === 'paused' ? 'warning' : 'neutral'}>{download.status === 'paused' ? 'Paused' : 'Interrupted'}</StatusBadge>}
            trailing={(
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => onResume(download)}><RotateCcw /> Resume</Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Dismiss" title="Dismiss" onClick={() => onDismiss(download)}><X /></Button>
              </>
            )}
          />
        ))}
      </ul>
    </section>
  );
}
