import { Check, Play } from 'lucide-react';
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
      aria-label={entry.title}
      onClick={onToggle}
      className={cn('relative aspect-square overflow-hidden rounded-xl transition-all duration-100', isSelected ? 'ring-2 ring-purple-400 ring-offset-1' : 'hover:opacity-80')}
    >
      {imageSrc && !hasImageError ? (
        <img src={imageSrc} alt="" loading="lazy" onError={() => setHasImageError(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-muted"><Play size={14} className="text-muted-foreground/30" /></span>
      )}
      {isSelected && (
        <span className="absolute inset-0 flex items-end justify-end bg-purple-500/20 p-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow"><Check size={10} /></span>
        </span>
      )}
      {duration && !isSelected && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 font-mono text-[9px] font-semibold text-white">{duration}</span>
      )}
    </button>
  );
}
