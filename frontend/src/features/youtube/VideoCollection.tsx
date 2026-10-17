import { SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

import EmptyState from '@/components/patterns/EmptyState';
import FilterChips from '@/components/patterns/FilterChips';
import SearchField from '@/components/patterns/SearchField';
import { Checkbox } from '@/components/ui/checkbox';
import { useIdSet } from '@/hooks/useIdSet';
import { VIDEO_QUALITIES } from '@/lib/qualities';
import SelectionBar from '../downloads/SelectionBar';
import { countBlocked, downloadTargets, filterEntries, isDownloadable } from './collectionFilters';
import VideoEntryRow from './VideoEntryRow';

import type { VideoQuality } from '@shared/downloads.ts';
import type { FilterChip } from '@/components/patterns/FilterChips';
import type { VideoEntry } from '@shared/youtube.ts';
import type { MediaDownloadHandlers } from '../downloads/downloadRequests';
import type { CollectionFilter } from './collectionFilters';

export interface VideoCollectionProps extends MediaDownloadHandlers {
  entries: VideoEntry[];
  noun: string;
  defaultQuality: VideoQuality;
}

// the searchable, selectable list a channel tab or a playlist shows, with its download bar
export default function VideoCollection({ entries, noun, defaultQuality, onDownload, onBulkDownload }: VideoCollectionProps) {
  const selection = useIdSet();
  const transcribeIds = useIdSet();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CollectionFilter>('all');
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);

  const shown = useMemo(() => filterEntries(entries, search, filter, selection.ids), [entries, search, filter, selection.ids]);
  const targets = downloadTargets(entries, shown, selection.ids);
  const selectedCount = entries.filter((entry) => selection.ids.has(entry.id)).length;
  const blockedCount = countBlocked(entries);
  const selectableShown = shown.filter(isDownloadable);
  const isAllSelected = selectableShown.length > 0 && selectableShown.every((entry) => selection.ids.has(entry.id));

  const chips: FilterChip<CollectionFilter>[] = [
    { value: 'all', label: 'All', count: entries.length },
    { value: 'selected', label: 'Selected', count: selectedCount },
    ...(blockedCount > 0 ? [{ value: 'blocked' as const, label: 'Not downloadable', count: blockedCount }] : []),
  ];

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

  function downloadOne(video: VideoEntry, chosenQuality: VideoQuality, isAudioOnly: boolean) {
    onDownload({ url: video.url, title: video.title, quality: chosenQuality, isAudioOnly, shouldTranscribe: transcribeIds.ids.has(video.id) });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={search} label={`Search the ${noun}s`} onChange={setSearch} className="min-w-[220px] flex-1" />
        <FilterChips<CollectionFilter> label="Show" chips={chips} value={filter} onChange={setFilter} />
      </div>
      <div className="mt-4 flex items-center gap-2.5 border-b border-divider px-3 pb-2.5 text-[13px] text-ink-muted">
        <Checkbox checked={isAllSelected} disabled={selectableShown.length === 0} onCheckedChange={() => selection.toggleMany(selectableShown.map((entry) => entry.id))} aria-label="Select everything shown" />
        <span>{isAllSelected ? 'Clear the selection' : 'Select everything shown'}</span>
        <span className="ml-auto text-xs text-ink-faint">Turn on the microphone on a row to transcribe it after download.</span>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title={search ? `Nothing matches "${search}"` : 'Nothing here'} description={search ? 'Try a shorter search, or show everything.' : `This list has no ${noun}s to show with this filter.`} />
      ) : (
        <ul className="mt-1 space-y-0.5">
          {shown.map((video) => (
            <VideoEntryRow
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

      <SelectionBar
        noun={noun}
        selectedCount={selectedCount}
        targetCount={targets.length}
        transcribeCount={targets.filter((video) => transcribeIds.ids.has(video.id)).length}
        quality={quality}
        qualities={VIDEO_QUALITIES}
        onQualityChange={setQuality}
        onDownload={() => downloadAll(false)}
        onDownloadAudio={() => downloadAll(true)}
      />
    </div>
  );
}
