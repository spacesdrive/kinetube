import { ListVideo } from 'lucide-react';

import MediaThumbnail from '@/components/patterns/MediaThumbnail';
import Notice from '@/components/patterns/Notice';
import SurfaceBox from '@/components/patterns/SurfaceBox';
import { Button } from '@/components/ui/button';
import { formatDuration, formatUploadDate, formatViews } from '@/lib/format';

import type { YouTubeVideo } from '@shared/youtube.ts';

export interface VideoPreviewProps {
  video: YouTubeVideo;
  onOpenLink(url: string): void;
}

export default function VideoPreview({ video, onOpenLink }: VideoPreviewProps) {
  const duration = formatDuration(video.duration) ?? video.durationText;
  const facts = [video.uploader, formatViews(video.viewCount), formatUploadDate(video.uploadDate)].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* a narrow window puts the picture beside the title, so the download options stay in view */}
      <SurfaceBox padding="none" className="flex flex-col overflow-hidden sm:flex-row lg:flex-col">
        <MediaThumbnail src={video.thumbnailUrl} alt={video.title} duration={duration} className="w-full rounded-none sm:w-60 lg:w-full" />
        <div className="min-w-0 flex-1 space-y-2 p-5">
          <h2 className="text-lg leading-[26px] font-semibold text-ink">{video.title}</h2>
          {facts.length > 0 && <p className="text-[13px] text-ink-muted">{facts.join('  ·  ')}</p>}
          {video.description && <p className="line-clamp-3 pt-1 text-[13px] leading-5 text-ink-muted">{video.description}</p>}
        </div>
      </SurfaceBox>
      {video.playlistUrl && (
        <Notice
          tone="accent"
          icon={ListVideo}
          title="This video is part of a playlist"
          action={<Button type="button" size="sm" variant="outline" onClick={() => video.playlistUrl && onOpenLink(video.playlistUrl)}>Load the playlist</Button>}
        >
          Open the whole list to pick more videos from it.
        </Notice>
      )}
    </div>
  );
}
