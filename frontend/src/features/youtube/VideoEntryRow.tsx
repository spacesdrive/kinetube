import { Download, Mic, MicOff, Music } from 'lucide-react';

import ListRow from '@/components/patterns/ListRow';
import MediaThumbnail from '@/components/patterns/MediaThumbnail';
import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDuration, formatUploadDate, formatViews } from '@/lib/format';
import { QUALITY_LABELS, VIDEO_QUALITIES } from '@/lib/qualities';
import { cn } from '@/lib/utils';
import { isDownloadable, STATUS_LABELS } from './collectionFilters';

import type { VideoQuality } from '@shared/downloads.ts';
import type { VideoEntry } from '@shared/youtube.ts';

export interface VideoEntryRowProps {
  video: VideoEntry;
  isSelected: boolean;
  shouldTranscribe: boolean;
  onToggle(videoId: string): void;
  onToggleTranscribe(videoId: string): void;
  onDownload(video: VideoEntry, quality: VideoQuality, isAudioOnly: boolean): void;
}

function QualityMenu({ video, onDownload }: Pick<VideoEntryRowProps, 'video' | 'onDownload'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Download ${video.title}`} title="Download this one" />}>
        <Download />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Base UI throws when a menu label sits outside a group, which blanks the whole app */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download as</DropdownMenuLabel>
          {VIDEO_QUALITIES.map((quality) => (
            <DropdownMenuItem key={quality} onClick={() => onDownload(video, quality, false)}>{QUALITY_LABELS[quality]}</DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDownload(video, 'best', true)}><Music /> Audio only (MP3)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function VideoEntryRow(props: VideoEntryRowProps) {
  const { video, isSelected, shouldTranscribe, onToggle, onToggleTranscribe } = props;
  const canDownload = isDownloadable(video);
  const meta = [formatViews(video.viewCount), formatUploadDate(video.uploadDate)].filter(Boolean).join('  ·  ');
  const statusBadge = video.status !== 'available' && <StatusBadge tone={video.status === 'unavailable' ? 'neutral' : 'warning'}>{STATUS_LABELS[video.status]}</StatusBadge>;

  return (
    <ListRow
      isSelected={isSelected}
      isDisabled={!canDownload}
      onActivate={() => onToggle(video.id)}
      activateLabel={`${isSelected ? 'Unselect' : 'Select'} ${video.title}`}
      leading={<Checkbox checked={isSelected} disabled={!canDownload} onCheckedChange={() => onToggle(video.id)} aria-label={`Select ${video.title}`} />}
      media={<MediaThumbnail src={video.thumbnailUrl} duration={formatDuration(video.duration) ?? video.durationText} className="w-28" />}
      title={video.title}
      meta={<>{statusBadge}{meta && <span>{meta}</span>}</>}
      trailing={canDownload && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-pressed={shouldTranscribe}
            aria-label={shouldTranscribe ? 'Stop transcribing this video' : 'Transcribe this video after download'}
            title={shouldTranscribe ? 'Transcription on. Select to turn it off.' : 'Transcribe after download'}
            onClick={() => onToggleTranscribe(video.id)}
            className={cn(shouldTranscribe ? 'bg-spin-soft text-spin-text hover:bg-spin-soft' : 'text-ink-faint')}
          >
            {shouldTranscribe ? <Mic /> : <MicOff />}
          </Button>
          <QualityMenu video={video} onDownload={props.onDownload} />
        </>
      )}
    />
  );
}
