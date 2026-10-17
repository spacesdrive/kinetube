import { RotateCcw, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-500">
      <RotateCcw className="h-4 w-4" />
      <AlertTitle>{bannerTitle(downloads.length)}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>These stopped before they finished. yt-dlp can pick up where it left off.</p>
        <ul className="space-y-1.5">
          {downloads.map((download) => (
            <li key={download.id} className="flex items-center justify-between gap-2 rounded-md bg-white/60 px-2.5 py-1.5">
              <span className="truncate text-sm" title={download.title || download.url}>{download.title || download.url}</span>
              <div className="flex shrink-0 gap-1.5">
                <Button type="button" size="sm" variant="secondary" onClick={() => onResume(download)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Resume
                </Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Dismiss" onClick={() => onDismiss(download)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
