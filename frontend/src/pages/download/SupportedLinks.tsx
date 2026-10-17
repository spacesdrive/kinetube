import StatusBadge from '@/components/patterns/StatusBadge';

import type { DownloadPlatformPage } from '@/lib/pages';

export interface SupportedLinksProps {
  platform: DownloadPlatformPage;
}

const LINK_TYPES: Record<DownloadPlatformPage, string[]> = {
  youtube: ['Videos', 'Shorts', 'Channels', 'Playlists', 'Live tab', 'MP3 audio'],
  instagram: ['Reels', 'Posts', 'Stories', 'Profiles'],
};

export default function SupportedLinks({ platform }: SupportedLinksProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-ink-faint">Works with</span>
      {LINK_TYPES[platform].map((type) => <StatusBadge key={type}>{type}</StatusBadge>)}
    </div>
  );
}
