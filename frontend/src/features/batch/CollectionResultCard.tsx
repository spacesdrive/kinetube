import { ChevronDown, User } from 'lucide-react';
import { useState } from 'react';

import PlatformBadge from '@/components/PlatformBadge';
import { Card, CardContent } from '@/components/ui/card';
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

function collectionHeader({ media }: FoundMedia): { name: string; avatarUrl: string | null } {
  if (media.kind === 'channel') return { name: media.name, avatarUrl: media.avatarUrl };
  if (media.kind === 'profile') return { name: `@${media.username}`, avatarUrl: media.avatarUrl };
  return { name: media.url, avatarUrl: null };
}

export default function CollectionResultCard({ found, selectedIds, onSelectionChange }: CollectionResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const entries = collectionEntries(found);
  const { name, avatarUrl } = collectionHeader(found);
  const isAllSelected = entries.length > 0 && selectedIds.size === entries.length;
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
    <Card className={cn('mb-3 overflow-hidden', selectedIds.size > 0 && 'border-purple-200')}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartlySelected}
            aria-label={`Select everything from ${name}`}
            onCheckedChange={() => onSelectionChange(isAllSelected ? new Set() : new Set(entries.map((entry) => entry.id)))}
          />
          <button type="button" aria-expanded={isExpanded} onClick={() => setIsExpanded((expanded) => !expanded)} className="flex min-w-0 flex-1 select-none items-center gap-3 text-left">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {avatarUrl && !hasAvatarError ? (
                <img src={imageSrc(avatarUrl) ?? ''} alt="" onError={() => setHasAvatarError(true)} className="h-full w-full object-cover" />
              ) : (
                <User size={16} className="text-muted-foreground/30" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="mt-0.5 flex items-center gap-2">
                <PlatformBadge platform={found.platform} />
                <span className="text-[10px] text-muted-foreground">{entries.length} items{selectedIds.size > 0 ? `, ${selectedIds.size} selected` : ''}</span>
              </span>
            </span>
            <ChevronDown size={16} className={cn('flex-shrink-0 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        </div>

        {isExpanded && (
          <div className="border-t p-3">
            {entries.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nothing was found here.</p>}
            {entries.length > 0 && (
              <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 md:grid-cols-6">
                {entries.map((entry) => (
                  <CollectionThumbnail key={entry.id} entry={entry} imageSrc={imageSrc(entry.thumbnailUrl)} isSelected={selectedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
