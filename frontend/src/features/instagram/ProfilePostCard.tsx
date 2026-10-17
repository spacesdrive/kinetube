import { Check, Download, Mic, MicOff, Play } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatCount, formatDuration } from '@/lib/format';
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

const OVERLAY_BUTTON = 'absolute top-2 z-10 rounded-md p-1 shadow-sm transition-opacity';

export default function ProfilePostCard({ post, isSelected, shouldTranscribe, onToggle, onToggleTranscribe, onDownload }: ProfilePostCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnail = hasImageError ? null : api.imageUrl(post.thumbnailUrl);
  const duration = formatDuration(post.duration);
  const views = formatCount(post.viewCount);

  return (
    <li className={cn('group relative overflow-hidden rounded-xl border bg-card transition-all duration-200', isSelected ? 'border-purple-400 shadow-sm ring-1 ring-purple-300' : 'border-border hover:border-muted-foreground/30')}>
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={isSelected ? 'Unselect post' : 'Select post'}
        onClick={() => onToggle(post.id)}
        className={cn(OVERLAY_BUTTON, 'left-2', isSelected ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'border bg-background/80 text-transparent opacity-0 group-hover:opacity-100')}
      >
        <Check size={12} />
      </button>
      <button
        type="button"
        aria-pressed={shouldTranscribe}
        aria-label={shouldTranscribe ? 'Stop transcribing this post' : 'Transcribe this post after download'}
        onClick={() => onToggleTranscribe(post.id)}
        className={cn(OVERLAY_BUTTON, 'right-2', shouldTranscribe ? 'bg-purple-600 text-white' : 'border bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100')}
      >
        {shouldTranscribe ? <Mic size={11} /> : <MicOff size={11} />}
      </button>

      <button type="button" onClick={() => onToggle(post.id)} className="relative block aspect-square w-full overflow-hidden bg-muted">
        {thumbnail ? (
          <img src={thumbnail} alt="" loading="lazy" onError={() => setHasImageError(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center"><Play size={24} className="text-muted-foreground/30" /></span>
        )}
        {duration && <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">{duration}</span>}
      </button>

      <div className="p-2.5">
        <p className="mb-1 line-clamp-2 text-xs leading-relaxed text-foreground">{post.title}</p>
        {views && <p className="mb-2 text-[10px] text-muted-foreground">{views} views</p>}
        <Button type="button" size="sm" onClick={() => onDownload(post)} className="h-7 w-full border-0 bg-gradient-to-r from-purple-600 to-pink-600 text-[11px] text-white hover:from-purple-700 hover:to-pink-700">
          <Download size={11} className="mr-1" />
          {shouldTranscribe ? 'Download and transcribe' : 'Download'}
        </Button>
      </div>
    </li>
  );
}
