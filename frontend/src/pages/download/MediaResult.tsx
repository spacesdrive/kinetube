import InstagramPostView from '@/features/instagram/InstagramPostView';
import InstagramProfileView from '@/features/instagram/InstagramProfileView';
import ChannelView from '@/features/youtube/ChannelView';
import VideoView from '@/features/youtube/VideoView';

import type { VideoQuality } from '@shared/downloads.ts';
import type { FoundMedia } from '@/features/batch/batchResults';
import type { MediaDownloadHandlers } from '@/features/downloads/downloadRequests';

export interface MediaResultProps extends MediaDownloadHandlers {
  found: FoundMedia;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
}

export default function MediaResult({ found, defaultQuality, isFfmpegInstalled, onDownload, onBulkDownload }: MediaResultProps) {
  const { media } = found;

  if (media.kind === 'video') return <VideoView video={media} defaultQuality={defaultQuality} isFfmpegInstalled={isFfmpegInstalled} onDownload={onDownload} />;
  if (media.kind === 'channel') return <ChannelView channel={media} defaultQuality={defaultQuality} onDownload={onDownload} onBulkDownload={onBulkDownload} />;
  if (media.kind === 'post') return <InstagramPostView post={media} defaultQuality={defaultQuality} onDownload={onDownload} />;
  return <InstagramProfileView profile={media} defaultQuality={defaultQuality} onDownload={onDownload} onBulkDownload={onBulkDownload} />;
}
