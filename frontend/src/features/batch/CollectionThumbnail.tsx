import { Check, Film } from 'lucide-react';
import { useState } from 'react';

import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { CollectionEntry } from './batchResults';

export interface CollectionThumbnailProps {
  entry: CollectionEntry;
  imageSrc: string | null;
  isSelected: boolean;
  onToggle(): void;
}

// its own component so each tile keeps its own image error state
export default function CollectionThumbnail({ entry, imageSrc, isSelected, onToggle }: CollectionThumbnailProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const duration = formatDuration(entry.duration);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={entry.isDownloadable ? entry.title : `${entry.title}, not downloadable yet`}
      title={entry.title}
      disabled={!entry.isDownloadable}
      onClick={onToggle}
      className={cn('relative aspect-square overflow-hidden rounded-row bg-surface-selected transition-quiet disabled:cursor-not-allowed disabled:opacity-40', isSelected ? 'ring-2 ring-spin ring-offset-2 ring-offset-surface' : 'hover:opacity-85')}
    >
      {imageSrc && !hasImageError ? (
        <img src={imageSrc} alt="" loading="lazy" onError={() => setHasImageError(true)} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-ink-faint"><Film size={14} /></span>
      )}
      {isSelected && (
        <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-pill bg-spin text-on-spin"><Check size={12} strokeWidth={3} /></span>
      )}
      {duration && !isSelected && (
        <span className="absolute right-1 bottom-1 rounded-[4px] bg-black/75 px-1 text-[10px] font-semibold text-white tabular-nums">{duration}</span>
      )}
    </button>
  );
}
