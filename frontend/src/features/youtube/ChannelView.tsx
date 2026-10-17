import { MicOff, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useIdSet } from '@/hooks/useIdSet';
import ChannelHeader from './ChannelHeader';
import ChannelToolbar from './ChannelToolbar';
import ChannelVideoRow from './ChannelVideoRow';

import type { VideoQuality } from '@shared/downloads.ts';
import type { ChannelEntry, YouTubeChannel } from '@shared/youtube.ts';
import type { MediaDownloadHandlers } from '../downloads/downloadRequests';

export interface ChannelViewProps extends MediaDownloadHandlers {
  channel: YouTubeChannel;
  defaultQuality: VideoQuality;
}

export default function ChannelView({ channel, defaultQuality, onDownload, onBulkDownload }: ChannelViewProps) {
  const selection = useIdSet();
  const transcribeIds = useIdSet();
  const [search, setSearch] = useState('');
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const isShorts = channel.urlType === 'channel-shorts';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? channel.entries.filter((video) => video.title.toLowerCase().includes(query)) : channel.entries;
  }, [channel.entries, search]);

  // nothing ticked means "everything the search shows"
  const selected = channel.entries.filter((video) => selection.ids.has(video.id));
  const targets = selected.length > 0 ? selected : filtered;
  const isAllSelected = filtered.length > 0 && filtered.every((video) => selection.ids.has(video.id));

  function downloadAll(isAudioOnly: boolean) {
    const items = targets.map((video) => ({
      key: video.id,
      url: video.url,
      title: video.title,
      platform: 'youtube' as const,
      shouldTranscribe: !isAudioOnly && transcribeIds.ids.has(video.id),
    }));
    onBulkDownload({ items, quality: isAudioOnly ? 'best' : quality, isAudioOnly });
  }

  function downloadOne(video: ChannelEntry, chosenQuality: VideoQuality, isAudioOnly: boolean) {
    onDownload({ url: video.url, title: video.title, quality: chosenQuality, isAudioOnly, shouldTranscribe: transcribeIds.ids.has(video.id) });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <ChannelHeader channel={channel} />
      <ChannelToolbar
        isAllSelected={isAllSelected}
        selectedCount={selected.length}
        transcribeCount={targets.filter((video) => transcribeIds.ids.has(video.id)).length}
        downloadCount={targets.length}
        quality={quality}
        onToggleAll={() => selection.toggleMany(filtered.map((video) => video.id))}
        onQualityChange={setQuality}
        onDownloadVideos={() => downloadAll(false)}
        onDownloadAudio={() => downloadAll(true)}
      />
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={`Search ${isShorts ? 'shorts' : 'videos'}`} placeholder={`Search ${isShorts ? 'shorts' : 'videos'}...`} value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-2xl pl-10" />
      </div>
      <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
        <MicOff size={11} /> Select the microphone on a video to save a transcript when it downloads.
      </p>
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p>Nothing matches "{search}".</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((video) => (
            <ChannelVideoRow
              key={video.id}
              video={video}
              isSelected={selection.ids.has(video.id)}
              shouldTranscribe={transcribeIds.ids.has(video.id)}
              onToggle={selection.toggle}
              onToggleTranscribe={transcribeIds.toggle}
              onDownload={downloadOne}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
