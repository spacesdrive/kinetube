import { Clock, Eye, Play } from 'lucide-react';
import { useState } from 'react';

import PlatformBadge from '@/components/PlatformBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

import type { FoundMedia } from './batchResults';

export interface SingleResultCardProps {
  found: FoundMedia;
  selectedIds: ReadonlySet<string>;
  onSelectionChange(selectedIds: ReadonlySet<string>): void;
}

function details({ media }: FoundMedia) {
  if (media.kind === 'video' || media.kind === 'post') {
    return { title: media.title, thumbnailUrl: media.thumbnailUrl, uploader: media.uploader, durationText: media.durationText, viewCount: media.viewCount };
  }
  return { title: media.url, thumbnailUrl: null, uploader: null, durationText: null, viewCount: null };
}

export default function SingleResultCard({ found, selectedIds, onSelectionChange }: SingleResultCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const { title, thumbnailUrl, uploader, durationText, viewCount } = details(found);
  const isSelected = selectedIds.has(found.media.url);
  const isInstagram = found.platform === 'instagram';
  // YouTube thumbnails load directly; Instagram blocks hotlinking, so its images go through the backend
  const thumbnail = isInstagram ? api.imageUrl(thumbnailUrl) : thumbnailUrl;
  const views = formatCount(viewCount);

  const toggle = (): void => onSelectionChange(isSelected ? new Set() : new Set([found.media.url]));

  return (
    <Card className={cn('mb-3 transition-all duration-150', isSelected ? 'border-purple-300 shadow-sm' : 'hover:border-muted-foreground/30')}>
      <CardContent className="flex items-start gap-3 p-3">
        <Checkbox checked={isSelected} onCheckedChange={toggle} aria-label={`Select ${title}`} className="mt-0.5" />
        <button type="button" onClick={toggle} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div className={cn('flex-shrink-0 overflow-hidden rounded-xl bg-muted', isInstagram ? 'aspect-[9/16] w-14' : 'h-14 w-24')}>
            {thumbnail && !hasImageError ? (
              <img src={thumbnail} alt="" onError={() => setHasImageError(true)} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center"><Play size={16} className="text-muted-foreground/30" /></span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <PlatformBadge platform={found.platform} />
              {uploader && <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">{uploader}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              {durationText && <span className="flex items-center gap-0.5"><Clock size={10} />{durationText}</span>}
              {views && <span className="flex items-center gap-0.5"><Eye size={10} />{views} views</span>}
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
