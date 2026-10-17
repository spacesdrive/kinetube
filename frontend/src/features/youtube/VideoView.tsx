import VideoDownloadTabs from './VideoDownloadTabs';
import VideoSummaryCard from './VideoSummaryCard';

import type { VideoQuality } from '@shared/downloads.ts';
import type { YouTubeVideo } from '@shared/youtube.ts';
import type { MediaDownloadRequest } from '../downloads/downloadRequests';

export interface VideoViewProps {
  video: YouTubeVideo;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
  onDownload(request: MediaDownloadRequest): void;
}

export default function VideoView({ video, defaultQuality, isFfmpegInstalled, onDownload }: VideoViewProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <VideoSummaryCard video={video} />
      <VideoDownloadTabs video={video} defaultQuality={defaultQuality} isFfmpegInstalled={isFfmpegInstalled} onDownload={onDownload} />
    </div>
  );
}
