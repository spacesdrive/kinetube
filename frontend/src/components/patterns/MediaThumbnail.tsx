import { Film } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface MediaThumbnailProps {
  src: string | null;
  alt?: string;
  duration?: string | null;
  badge?: ReactNode;
  className?: string;
}

// the box keeps its own aspect ratio, so the image always has a height to fill
export default function MediaThumbnail({ src, alt = '', duration, badge, className }: MediaThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const isShown = Boolean(src) && !hasError;

  return (
    <span className={cn('relative block aspect-video flex-shrink-0 overflow-hidden rounded-row bg-surface-selected', className)}>
      {isShown && src ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setHasError(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-ink-faint"><Film size={18} aria-hidden="true" /></span>
      )}
      {badge && <span className="absolute top-1.5 left-1.5">{badge}</span>}
      {duration && (
        <span className="absolute right-1.5 bottom-1.5 rounded-[5px] bg-black/75 px-1.5 py-px text-[11px] leading-4 font-semibold text-white tabular-nums">{duration}</span>
      )}
    </span>
  );
}
