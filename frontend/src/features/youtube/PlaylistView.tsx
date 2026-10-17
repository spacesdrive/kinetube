import CollectionHeader from '@/components/patterns/CollectionHeader';
import { pluralize } from '@/lib/format';
import VideoCollection from './VideoCollection';

import type { VideoQuality } from '@shared/downloads.ts';
import type { YouTubePlaylist } from '@shared/youtube.ts';
import type { MediaDownloadHandlers } from '../downloads/downloadRequests';

export interface PlaylistViewProps extends MediaDownloadHandlers {
  playlist: YouTubePlaylist;
  defaultQuality: VideoQuality;
}

// YouTube's count can include hidden videos, so the list may be shorter than the number it reports
export default function PlaylistView({ playlist, defaultQuality, onDownload, onBulkDownload }: PlaylistViewProps) {
  const hidden = playlist.videoCount - playlist.entries.length;
  const facts = ['Playlist', playlist.owner, pluralize(playlist.entries.length, 'video'), hidden > 0 ? `${hidden} hidden by YouTube` : null].filter((fact): fact is string => Boolean(fact));

  return (
    <div className="space-y-6">
      <CollectionHeader title={playlist.title} imageUrl={playlist.thumbnailUrl} isRound={false} facts={facts} />
      <VideoCollection key={playlist.url} entries={playlist.entries} noun="video" defaultQuality={defaultQuality} onDownload={onDownload} onBulkDownload={onBulkDownload} />
    </div>
  );
}
