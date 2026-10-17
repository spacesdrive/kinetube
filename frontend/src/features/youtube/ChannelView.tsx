import CollectionHeader from '@/components/patterns/CollectionHeader';
import LoadingState from '@/components/patterns/LoadingState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pluralize } from '@/lib/format';
import { api } from '@/services/api';
import PlaylistGrid from './PlaylistGrid';
import VideoCollection from './VideoCollection';

import type { VideoQuality } from '@shared/downloads.ts';
import type { ChannelTab, YouTubeChannel } from '@shared/youtube.ts';
import type { MediaDownloadHandlers } from '../downloads/downloadRequests';

export interface ChannelViewProps extends MediaDownloadHandlers {
  channel: YouTubeChannel;
  defaultQuality: VideoQuality;
  isRefreshing: boolean;
  onOpenLink(url: string): void;
}

const TABS: { tab: ChannelTab; label: string; noun: string }[] = [
  { tab: 'videos', label: 'Videos', noun: 'video' },
  { tab: 'shorts', label: 'Shorts', noun: 'short' },
  { tab: 'streams', label: 'Live', noun: 'stream' },
  { tab: 'playlists', label: 'Playlists', noun: 'playlist' },
];

function isChannelTab(value: unknown): value is ChannelTab {
  return TABS.some(({ tab }) => tab === value);
}

// each tab is its own yt-dlp listing, so switching tabs fetches that tab's link
export default function ChannelView({ channel, defaultQuality, isRefreshing, onOpenLink, onDownload, onBulkDownload }: ChannelViewProps) {
  const current = TABS.find(({ tab }) => tab === channel.tab) ?? TABS[0];
  const noun = current?.noun ?? 'video';
  const count = channel.tab === 'playlists' ? channel.playlists.length : channel.videoCount;

  return (
    <div className="space-y-6">
      <CollectionHeader title={channel.name} imageUrl={api.imageUrl(channel.avatarUrl)} isRound facts={['Channel', pluralize(count, noun)]} />
      <Tabs value={channel.tab} onValueChange={(value) => { if (isChannelTab(value) && value !== channel.tab) onOpenLink(`https://www.youtube.com/${channel.channelPath}/${value}`); }}>
        <TabsList variant="line" className="w-full justify-start">
          {TABS.map(({ tab, label }) => <TabsTrigger key={tab} value={tab} disabled={isRefreshing}>{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {isRefreshing && <LoadingState label="Loading this tab from YouTube" rows={4} />}
      {!isRefreshing && channel.tab === 'playlists' && <PlaylistGrid playlists={channel.playlists} onOpen={onOpenLink} />}
      {!isRefreshing && channel.tab !== 'playlists' && (
        <VideoCollection key={channel.url} entries={channel.entries} noun={noun} defaultQuality={defaultQuality} onDownload={onDownload} onBulkDownload={onBulkDownload} />
      )}
    </div>
  );
}
