import { ListVideo } from 'lucide-react';

import EmptyState from '@/components/patterns/EmptyState';
import MediaThumbnail from '@/components/patterns/MediaThumbnail';

import type { PlaylistEntry } from '@shared/youtube.ts';

export interface PlaylistGridProps {
  playlists: PlaylistEntry[];
  onOpen(url: string): void;
}

export default function PlaylistGrid({ playlists, onOpen }: PlaylistGridProps) {
  if (playlists.length === 0) {
    return <EmptyState icon={ListVideo} title="No public playlists" description="This channel hasn't shared any playlists." />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {playlists.map((playlist) => (
        <li key={playlist.id}>
          <button type="button" onClick={() => onOpen(playlist.url)} className="group w-full rounded-card bg-surface p-2 text-left transition-quiet hover:bg-surface-selected">
            <MediaThumbnail src={playlist.thumbnailUrl} badge={<span className="flex items-center gap-1 rounded-[5px] bg-black/75 px-1.5 py-px text-[11px] font-semibold text-white"><ListVideo size={12} /> Playlist</span>} className="w-full rounded-control" />
            <span className="block px-1.5 pt-2.5 pb-1 text-sm font-medium text-ink">{playlist.title}</span>
            <span className="block px-1.5 pb-1 text-xs text-ink-muted group-hover:text-spin-text">Open to pick videos</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
