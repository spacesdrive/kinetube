import { Check, XCircle } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import type { BulkItemState } from './bulkDownloadState';

export interface BulkQueueListProps {
  items: BulkItemState[];
}

function ItemIcon({ item }: { item: BulkItemState }) {
  if (item.status === 'running') return <Spinner className="size-3.5 text-blue-500" />;
  if (item.status === 'pending') return <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />;
  if (item.isSuccess) return <Check size={13} className="text-green-500" />;
  return <XCircle size={13} className="text-red-500" />;
}

function rowClass(item: BulkItemState): string {
  if (item.status === 'running') return 'bg-blue-50';
  if (item.status === 'pending') return 'bg-muted/50';
  return item.isSuccess ? 'bg-green-50' : 'bg-red-50';
}

function titleClass(item: BulkItemState): string {
  if (item.status === 'running') return 'font-medium text-blue-700';
  if (item.status === 'pending') return 'text-muted-foreground';
  return item.isSuccess ? 'text-green-700' : 'text-red-600';
}

export default function BulkQueueList({ items }: BulkQueueListProps) {
  return (
    <ScrollArea className="max-h-44">
      <ul className="space-y-1 pr-1">
        {items.map((item) => (
          <li key={item.key} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs', rowClass(item))} title={item.message ?? undefined}>
            <span className="flex w-4 flex-shrink-0 items-center justify-center"><ItemIcon item={item} /></span>
            <span
              aria-label={item.platform === 'instagram' ? 'Instagram' : 'YouTube'}
              className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', item.platform === 'instagram' ? 'bg-pink-500' : 'bg-red-500')}
            />
            <span className={cn('flex-1 truncate', titleClass(item))}>{item.title}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
