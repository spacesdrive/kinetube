import { Check, XCircle } from 'lucide-react';

import { InstagramIcon, YouTubeIcon } from '@/components/icons/BrandIcons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import type { BulkItemState } from './bulkDownloadState';

export interface BulkQueueListProps {
  items: BulkItemState[];
}

function ItemIcon({ item }: { item: BulkItemState }) {
  if (item.status === 'running') return <Spinner className="size-3.5 text-spin-text" />;
  if (item.status === 'pending') return <span className="size-2.5 rounded-pill border-2 border-line-strong" />;
  if (item.isSuccess) return <Check size={14} className="text-success" />;
  return <XCircle size={14} className="text-error" />;
}

export default function BulkQueueList({ items }: BulkQueueListProps) {
  return (
    <ScrollArea className="max-h-48">
      <ul className="space-y-0.5 pr-2">
        {items.map((item) => (
          <li key={item.key} title={item.message ?? undefined} className={cn('flex items-center gap-2.5 rounded-row px-2.5 py-1.5 text-[13px]', item.status === 'running' && 'bg-spin-soft')}>
            <span className="flex w-4 flex-shrink-0 items-center justify-center"><ItemIcon item={item} /></span>
            <span aria-label={item.platform === 'instagram' ? 'Instagram' : 'YouTube'} className="text-ink-faint">
              {item.platform === 'instagram' ? <InstagramIcon className="size-3" /> : <YouTubeIcon className="size-3" />}
            </span>
            <span className={cn('flex-1 truncate', item.status === 'pending' ? 'text-ink-muted' : 'text-ink', item.status === 'done' && !item.isSuccess && 'text-error')}>{item.title}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
