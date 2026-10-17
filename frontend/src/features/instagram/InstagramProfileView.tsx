import { Download, Mic, MicOff, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import QualitySelect from '@/components/QualitySelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useIdSet } from '@/hooks/useIdSet';
import { SHORT_QUALITY_LIST } from '@/lib/qualities';
import ProfileHeader from './ProfileHeader';
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
  const isAllSelected = filtered.length > 0 && filtered.every((post) => selection.ids.has(post.id));
  const transcribeCount = selected.filter((post) => transcribeIds.ids.has(post.id)).length;

  function downloadSelected() {
    const items = selected.map((post) => ({
      key: post.id,
      url: post.url,
      title: post.title,
      platform: 'instagram' as const,
      shouldTranscribe: transcribeIds.ids.has(post.id),
    }));
    onBulkDownload({ items, quality, isAudioOnly: false });
  }

  function downloadOne(post: ProfileEntry) {
    onDownload({ url: post.url, title: post.title, quality, isAudioOnly: false, shouldTranscribe: transcribeIds.ids.has(post.id) });
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-5xl animate-fade-slide-up">
      <ProfileHeader profile={profile} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Filter posts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter posts..." className="h-9 pl-8 text-sm" />
        </div>
        <QualitySelect value={quality} options={SHORT_QUALITY_LIST} onChange={setQuality} className="h-9 w-36 text-sm" />
        <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm">
          <Checkbox checked={isAllSelected} onCheckedChange={() => selection.toggleMany(filtered.map((post) => post.id))} />
          {isAllSelected ? 'Clear selection' : 'Select all'}
        </label>
        {transcribeCount > 0 && (
          <Badge variant="secondary" className="gap-1 border border-purple-100 bg-purple-50 px-3 py-1.5 text-purple-600"><Mic size={11} /> {transcribeCount} to transcribe</Badge>
        )}
        <Button type="button" size="sm" onClick={downloadSelected} disabled={selected.length === 0} className="h-9 border-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
          <Download size={13} className="mr-1.5" />
          Download {selected.length > 0 ? `(${selected.length})` : 'selected'}
        </Button>
      </div>
      <p className="mb-3 flex items-center gap-1 px-1 text-xs text-muted-foreground">
        <MicOff size={11} /> Select the microphone on a post to save a transcript when it downloads.
      </p>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">{search ? 'No posts match the filter.' : 'This profile has no posts KineTube can read.'}</div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
    </div>
  );
}
