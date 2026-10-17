import { Calendar, Download, Eye, Mic, MicOff, Music, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCount, formatUploadDate } from '@/lib/format';
import { QUALITY_LABELS, VIDEO_QUALITIES } from '@/lib/qualities';
import { cn } from '@/lib/utils';

import type { VideoQuality } from '@shared/downloads.ts';
import type { ChannelEntry } from '@shared/youtube.ts';

export interface ChannelVideoRowProps {
  video: ChannelEntry;
  isSelected: boolean;
  shouldTranscribe: boolean;
  onToggle(videoId: string): void;
  onToggleTranscribe(videoId: string): void;
  onDownload(video: ChannelEntry, quality: VideoQuality, isAudioOnly: boolean): void;
}

function QualityMenu({ video, onDownload }: Pick<ChannelVideoRowProps, 'video' | 'onDownload'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Download ${video.title}`} className="h-8 w-8 text-muted-foreground hover:text-foreground" />}>
        <Download size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Quality</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VIDEO_QUALITIES.map((quality) => (
          <DropdownMenuItem key={quality} onClick={() => onDownload(video, quality, false)}>
            <Play size={12} className="mr-2" />
            {QUALITY_LABELS[quality]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDownload(video, 'best', true)} className="text-purple-600">
          <Music size={12} className="mr-2" />
          Audio only (MP3)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ChannelVideoRow(props: ChannelVideoRowProps) {
  const { video, isSelected, shouldTranscribe, onToggle, onToggleTranscribe } = props;
  const views = formatCount(video.viewCount);
  const date = formatUploadDate(video.uploadDate);

  return (
    <li className={cn('relative flex gap-3 rounded-2xl border p-3 transition-all', isSelected ? 'border-blue-300 bg-blue-50/60' : 'border-border bg-card hover:border-muted-foreground/30')}>
      <Checkbox checked={isSelected} onCheckedChange={() => onToggle(video.id)} aria-label={`Select ${video.title}`} className="mt-0.5" />
      <button type="button" onClick={() => onToggle(video.id)} className="flex min-w-0 flex-1 gap-3 text-left">
        <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          {video.durationText && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">{video.durationText}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {views && <span className="flex items-center gap-1"><Eye size={11} /> {views}</span>}
            {date && <span className="flex items-center gap-1"><Calendar size={11} /> {date}</span>}
          </div>
        </div>
      </button>
      <div className="flex flex-shrink-0 items-center gap-1 self-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-pressed={shouldTranscribe}
          aria-label={shouldTranscribe ? 'Stop transcribing this video' : 'Transcribe this video after download'}
          title={shouldTranscribe ? 'Transcription on. Select to turn it off.' : 'Transcribe after download'}
          onClick={() => onToggleTranscribe(video.id)}
          className={cn('h-8 w-8', shouldTranscribe ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'text-muted-foreground/40 hover:text-muted-foreground')}
        >
          {shouldTranscribe ? <Mic size={14} /> : <MicOff size={14} />}
        </Button>
        <QualityMenu {...props} />
      </div>
    </li>
  );
}
