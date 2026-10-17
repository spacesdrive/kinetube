import { ChevronDown, Film } from 'lucide-react';
import { useState } from 'react';

import PlatformBadge from '@/components/PlatformBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { collectionEntries } from './batchResults';
import CollectionThumbnail from './CollectionThumbnail';

import type { FoundMedia } from './batchResults';

export interface CollectionResultCardProps {
  found: FoundMedia;
  selectedIds: ReadonlySet<string>;
  onSelectionChange(selectedIds: ReadonlySet<string>): void;
}

function collectionHeader({ media }: FoundMedia): { name: string; imageUrl: string | null; isRound: boolean } {
  if (media.kind === 'channel') return { name: media.name, imageUrl: api.imageUrl(media.avatarUrl), isRound: true };
  if (media.kind === 'playlist') return { name: media.title, imageUrl: media.thumbnailUrl, isRound: false };
  if (media.kind === 'profile') return { name: `@${media.username}`, imageUrl: api.imageUrl(media.avatarUrl), isRound: true };
  return { name: media.url, imageUrl: null, isRound: true };
}

export default function CollectionResultCard({ found, selectedIds, onSelectionChange }: CollectionResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const entries = collectionEntries(found);
  const selectable = entries.filter((entry) => entry.isDownloadable);
  const { name, imageUrl, isRound } = collectionHeader(found);
  const isAllSelected = selectable.length > 0 && selectedIds.size === selectable.length;
  const isPartlySelected = selectedIds.size > 0 && !isAllSelected;
  // YouTube thumbnails load directly; Instagram blocks hotlinking, so its images go through the backend
  const imageSrc = (url: string | null): string | null => (found.platform === 'instagram' ? api.imageUrl(url) : url);

  function toggleEntry(entryId: string) {
    const next = new Set(selectedIds);
    if (next.has(entryId)) next.delete(entryId);
    else next.add(entryId);
    onSelectionChange(next);
  }

  return (
    <div className={cn('overflow-hidden rounded-control transition-quiet', selectedIds.size > 0 ? 'bg-spin-soft' : 'bg-surface')}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isPartlySelected}
          disabled={selectable.length === 0}
          aria-label={`Select everything from ${name}`}
          onCheckedChange={() => onSelectionChange(isAllSelected ? new Set() : new Set(selectable.map((entry) => entry.id)))}
        />
        <button type="button" aria-expanded={isExpanded} onClick={() => setIsExpanded((expanded) => !expanded)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={cn('flex size-10 flex-shrink-0 items-center justify-center overflow-hidden bg-surface-selected text-ink-faint', isRound ? 'rounded-pill' : 'rounded-row')}>
            {imageUrl && !hasImageError ? <img src={imageUrl} alt="" onError={() => setHasImageError(true)} className="size-full object-cover" /> : <Film size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{name}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
              <PlatformBadge platform={found.platform} />
              {entries.length} items{selectedIds.size > 0 ? `, ${selectedIds.size} selected` : ''}
            </span>
          </span>
          <ChevronDown size={16} className={cn('flex-shrink-0 text-ink-faint transition-transform duration-200', isExpanded && 'rotate-180')} />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-divider p-3">
          {entries.length === 0 && <p className="py-4 text-center text-[13px] text-ink-muted">Nothing was found here.</p>}
          {entries.length > 0 && (
            <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
              {entries.map((entry) => (
                <CollectionThumbnail key={entry.id} entry={entry} imageSrc={imageSrc(entry.thumbnailUrl)} isSelected={selectedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
