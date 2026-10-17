import { Film } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface CollectionHeaderProps {
  title: string;
  imageUrl: string | null;
  isRound: boolean;
  facts: string[];
  children?: ReactNode;
}

export default function CollectionHeader({ title, imageUrl, isRound, facts, children }: CollectionHeaderProps) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <header className="flex items-center gap-4">
      <span className={cn('flex flex-shrink-0 items-center justify-center overflow-hidden bg-surface-selected text-ink-faint', isRound ? 'size-16 rounded-pill' : 'aspect-video w-28 rounded-control')}>
        {imageUrl && !hasImageError ? (
          <img src={imageUrl} alt="" onError={() => setHasImageError(true)} className="size-full object-cover" />
        ) : (
          <Film size={20} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-page-title truncate text-ink">{title}</h2>
        {facts.length > 0 && <p className="mt-1 text-[13px] text-ink-muted">{facts.join('  ·  ')}</p>}
      </div>
      {children}
    </header>
  );
}
