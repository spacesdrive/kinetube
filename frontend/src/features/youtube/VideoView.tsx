import VideoDownloadPanel from './VideoDownloadPanel';
import VideoPreview from './VideoPreview';

import type { VideoQuality } from '@shared/downloads.ts';
import type { YouTubeVideo } from '@shared/youtube.ts';
import type { MediaDownloadRequest } from '../downloads/downloadRequests';

export interface VideoViewProps {
  video: YouTubeVideo;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
  onDownload(request: MediaDownloadRequest): void;
  onOpenLink(url: string): void;
}

// a working surface with its settings column, so the video stays in view while the options change
export default function VideoView({ video, defaultQuality, isFfmpegInstalled, onDownload, onOpenLink }: VideoViewProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--panel-width)]">
      <VideoPreview video={video} onOpenLink={onOpenLink} />
      <VideoDownloadPanel key={video.id} video={video} defaultQuality={defaultQuality} isFfmpegInstalled={isFfmpegInstalled} onDownload={onDownload} />
    </div>
  );
}
