import { AlertTriangle, Check, FileText, XCircle } from 'lucide-react';

import { InstagramIcon, YouTubeIcon } from '@/components/icons/BrandIcons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { formatList, formatsOfFiles } from '@/lib/transcriptFormats';
import { cn } from '@/lib/utils';

import type { BulkItemState } from './bulkDownloadState';

export interface BulkQueueListProps {
  items: BulkItemState[];
}

function ItemIcon({ item }: { item: BulkItemState }) {
  if (item.status === 'running' || item.status === 'transcribing') return <Spinner className="size-3.5 text-spin-text" />;
  if (item.status === 'pending') return <span className="size-2.5 rounded-pill border-2 border-line-strong" />;
  if (item.isSuccess) return <Check size={14} className="text-success" />;
  return <XCircle size={14} className="text-error" />;
}

// the transcript's state at the end of the row: running, saved, failed, or nothing asked for
function TranscriptNote({ item }: { item: BulkItemState }) {
  if (item.status === 'transcribing') return <span className="flex-shrink-0 text-xs text-spin-text">Transcribing</span>;
  if (item.transcriptPaths.length > 0) {
    const label = `Transcript saved as ${formatList(formatsOfFiles(item.transcriptPaths))}`;
    return <span role="img" aria-label={label} title={label} className="text-success"><FileText size={13} /></span>;
  }
  if (item.transcriptError) return <span role="img" aria-label={item.transcriptError} title={item.transcriptError} className="text-warning"><AlertTriangle size={13} /></span>;
  return null;
}

export default function BulkQueueList({ items }: BulkQueueListProps) {
  return (
    // the cap sits on the viewport: the root has no height of its own, so a cap there never makes the list scroll
    <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-56">
      <ul className="space-y-0.5 pr-2">
        {items.map((item) => (
          <li key={item.key} title={item.message ?? undefined} className={cn('flex items-center gap-2.5 rounded-row px-2.5 py-1.5 text-[13px]', (item.status === 'running' || item.status === 'transcribing') && 'bg-spin-soft')}>
            <span className="flex w-4 flex-shrink-0 items-center justify-center"><ItemIcon item={item} /></span>
            <span aria-label={item.platform === 'instagram' ? 'Instagram' : 'YouTube'} className="text-ink-faint">
              {item.platform === 'instagram' ? <InstagramIcon className="size-3" /> : <YouTubeIcon className="size-3" />}
            </span>
            <span className={cn('min-w-0 flex-1 truncate', item.status === 'pending' ? 'text-ink-muted' : 'text-ink', item.status === 'done' && !item.isSuccess && 'text-error')}>{item.title}</span>
            <TranscriptNote item={item} />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
