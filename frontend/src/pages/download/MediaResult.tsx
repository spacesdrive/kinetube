import InstagramPostView from '@/features/instagram/InstagramPostView';
import InstagramProfileView from '@/features/instagram/InstagramProfileView';
import ChannelView from '@/features/youtube/ChannelView';
import PlaylistView from '@/features/youtube/PlaylistView';
import VideoView from '@/features/youtube/VideoView';

import type { VideoQuality } from '@shared/downloads.ts';
import type { FoundMedia } from '@/features/batch/batchResults';
import type { MediaDownloadHandlers } from '@/features/downloads/downloadRequests';

export interface MediaResultProps extends MediaDownloadHandlers {
  found: FoundMedia;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
  // a channel tab loading in the background, while the last tab stays on screen
  isRefreshing: boolean;
  onOpenLink(url: string): void;
}

export default function MediaResult({ found, defaultQuality, isFfmpegInstalled, isRefreshing, onDownload, onBulkDownload, onOpenLink }: MediaResultProps) {
  const { media } = found;
  const handlers = { onDownload, onBulkDownload };

  if (media.kind === 'video') return <VideoView video={media} defaultQuality={defaultQuality} isFfmpegInstalled={isFfmpegInstalled} onDownload={onDownload} onOpenLink={onOpenLink} />;
  if (media.kind === 'channel') return <ChannelView channel={media} defaultQuality={defaultQuality} isRefreshing={isRefreshing} onOpenLink={onOpenLink} {...handlers} />;
  if (media.kind === 'playlist') return <PlaylistView playlist={media} defaultQuality={defaultQuality} {...handlers} />;
  if (media.kind === 'post') return <InstagramPostView post={media} defaultQuality={defaultQuality} onDownload={onDownload} />;
  return <InstagramProfileView profile={media} defaultQuality={defaultQuality} {...handlers} />;
}
