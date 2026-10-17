import MediaThumbnail from '@/components/patterns/MediaThumbnail';
import PlatformBadge from '@/components/PlatformBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDuration, formatViews } from '@/lib/format';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

import type { FoundMedia } from './batchResults';

export interface SingleResultCardProps {
  found: FoundMedia;
  selectedIds: ReadonlySet<string>;
  onSelectionChange(selectedIds: ReadonlySet<string>): void;
}

function details({ media }: FoundMedia) {
  if (media.kind === 'video') {
    return { title: media.title, thumbnailUrl: media.thumbnailUrl, uploader: media.uploader, duration: formatDuration(media.duration) ?? media.durationText, viewCount: media.viewCount };
  }
  if (media.kind === 'post') {
    return { title: media.title, thumbnailUrl: media.thumbnailUrl, uploader: media.uploader, duration: formatDuration(media.duration), viewCount: media.viewCount };
  }
  return { title: media.url, thumbnailUrl: null, uploader: null, duration: null, viewCount: null };
}

export default function SingleResultCard({ found, selectedIds, onSelectionChange }: SingleResultCardProps) {
  const { title, thumbnailUrl, uploader, duration, viewCount } = details(found);
  const isSelected = selectedIds.has(found.media.url);
  const isInstagram = found.platform === 'instagram';
  // YouTube thumbnails load directly; Instagram blocks hotlinking, so its images go through the backend
  const thumbnail = isInstagram ? api.imageUrl(thumbnailUrl) : thumbnailUrl;
  const meta = [uploader, formatViews(viewCount)].filter(Boolean).join('  ·  ');
  const toggle = (): void => onSelectionChange(isSelected ? new Set() : new Set([found.media.url]));

  return (
    <div className={cn('flex items-center gap-3 rounded-control px-3 py-2.5 transition-quiet', isSelected ? 'bg-spin-soft' : 'bg-surface hover:bg-surface-selected')}>
      <Checkbox checked={isSelected} onCheckedChange={toggle} aria-label={`Select ${title}`} />
      <button type="button" onClick={toggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <MediaThumbnail src={thumbnail} duration={duration} className={isInstagram ? 'aspect-[4/5] w-12' : 'w-24'} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-medium text-ink">{title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <PlatformBadge platform={found.platform} />
            {meta && <span className="truncate">{meta}</span>}
          </span>
        </span>
      </button>
    </div>
  );
}
