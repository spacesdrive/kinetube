import { Check, Download, Mic, MicOff } from 'lucide-react';

import MediaThumbnail from '@/components/patterns/MediaThumbnail';
import { Button } from '@/components/ui/button';
import { formatDuration, formatViews } from '@/lib/format';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

import type { ProfileEntry } from '@shared/instagram.ts';

export interface ProfilePostCardProps {
  post: ProfileEntry;
  isSelected: boolean;
  shouldTranscribe: boolean;
  onToggle(postId: string): void;
  onToggleTranscribe(postId: string): void;
  onDownload(post: ProfileEntry): void;
}

export default function ProfilePostCard({ post, isSelected, shouldTranscribe, onToggle, onToggleTranscribe, onDownload }: ProfilePostCardProps) {
  const views = formatViews(post.viewCount);

  return (
    <li className={cn('group relative rounded-card p-2 transition-quiet', isSelected ? 'bg-spin-soft' : 'bg-surface hover:bg-surface-selected')}>
      <button type="button" aria-pressed={isSelected} aria-label={isSelected ? 'Unselect post' : 'Select post'} onClick={() => onToggle(post.id)} className="block w-full rounded-control">
        <MediaThumbnail src={api.imageUrl(post.thumbnailUrl)} duration={formatDuration(post.duration)} className="aspect-square w-full rounded-control" />
      </button>
      <span aria-hidden="true" className={cn('pointer-events-none absolute top-4 left-4 flex size-6 items-center justify-center rounded-pill transition-quiet', isSelected ? 'bg-spin text-on-spin' : 'bg-black/45 text-transparent opacity-0 group-hover:opacity-100')}>
        <Check size={13} strokeWidth={3} />
      </span>
      <div className="px-1 pt-2.5 pb-1">
        <p className="line-clamp-2 min-h-8 text-xs leading-4 text-ink">{post.title}</p>
        <div className="mt-2 flex items-center gap-1">
          <span className="flex-1 truncate text-[11px] text-ink-faint">{views ?? ' '}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-pressed={shouldTranscribe}
            aria-label={shouldTranscribe ? 'Stop transcribing this post' : 'Transcribe this post after download'}
            onClick={() => onToggleTranscribe(post.id)}
            className={cn(shouldTranscribe ? 'bg-spin-soft text-spin-text' : 'text-ink-faint')}
          >
            {shouldTranscribe ? <Mic /> : <MicOff />}
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Download ${post.title}`} title="Download this one" onClick={() => onDownload(post)}><Download /></Button>
        </div>
      </div>
    </li>
  );
}
