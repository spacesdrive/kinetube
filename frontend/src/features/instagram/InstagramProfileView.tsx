import { SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

import CollectionHeader from '@/components/patterns/CollectionHeader';
import EmptyState from '@/components/patterns/EmptyState';
import Notice from '@/components/patterns/Notice';
import SearchField from '@/components/patterns/SearchField';
import { Checkbox } from '@/components/ui/checkbox';
import { useIdSet } from '@/hooks/useIdSet';
import { pluralize } from '@/lib/format';
import { SHORT_QUALITY_LIST } from '@/lib/qualities';
import { api } from '@/services/api';
import SelectionBar from '../downloads/SelectionBar';
import ProfilePostCard from './ProfilePostCard';

import type { VideoQuality } from '@shared/downloads.ts';
import type { InstagramProfile, ProfileEntry } from '@shared/instagram.ts';
import type { MediaDownloadHandlers } from '../downloads/downloadRequests';

export interface InstagramProfileViewProps extends MediaDownloadHandlers {
  profile: InstagramProfile;
  defaultQuality: VideoQuality;
}

export default function InstagramProfileView({ profile, defaultQuality, onDownload, onBulkDownload }: InstagramProfileViewProps) {
  const selection = useIdSet();
  const transcribeIds = useIdSet();
  const [search, setSearch] = useState('');
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? profile.entries.filter((post) => post.title.toLowerCase().includes(query)) : profile.entries;
  }, [profile.entries, search]);

  const selected = profile.entries.filter((post) => selection.ids.has(post.id));
  const targets = selected.length > 0 ? selected : filtered;
  const isAllSelected = filtered.length > 0 && filtered.every((post) => selection.ids.has(post.id));

  function downloadTargets() {
    const items = targets.map((post) => ({ key: post.id, url: post.url, title: post.title, platform: 'instagram' as const, shouldTranscribe: transcribeIds.ids.has(post.id) }));
    onBulkDownload({ items, quality, isAudioOnly: false });
  }

  function downloadOne(post: ProfileEntry) {
    onDownload({ url: post.url, title: post.title, quality, isAudioOnly: false, shouldTranscribe: transcribeIds.ids.has(post.id) });
  }

  return (
    <div className="space-y-6">
      <CollectionHeader title={`@${profile.username}`} imageUrl={api.imageUrl(profile.avatarUrl)} isRound facts={[profile.name, pluralize(profile.postCount, 'post')].filter(Boolean)} />
      {profile.isTruncated && <Notice tone="info">Showing the first {profile.entries.length} posts. Instagram limits how many one lookup can read.</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={search} label="Search the posts" onChange={setSearch} className="min-w-[220px] flex-1" />
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-3 text-[13px] text-ink-muted">
          <Checkbox checked={isAllSelected} onCheckedChange={() => selection.toggleMany(filtered.map((post) => post.id))} />
          {isAllSelected ? 'Clear the selection' : 'Select everything shown'}
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title={search ? `Nothing matches "${search}"` : 'No posts to show'} description={search ? 'Try a shorter search.' : 'This profile has no posts kinetube can read.'} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((post) => (
            <ProfilePostCard
              key={post.id}
              post={post}
              isSelected={selection.ids.has(post.id)}
              shouldTranscribe={transcribeIds.ids.has(post.id)}
              onToggle={selection.toggle}
              onToggleTranscribe={transcribeIds.toggle}
              onDownload={downloadOne}
            />
          ))}
        </ul>
      )}

      <SelectionBar
        noun="post"
        selectedCount={selected.length}
        targetCount={targets.length}
        transcribeCount={targets.filter((post) => transcribeIds.ids.has(post.id)).length}
        quality={quality}
        qualities={SHORT_QUALITY_LIST}
        onQualityChange={setQuality}
        onDownload={downloadTargets}
      />
    </div>
  );
}
