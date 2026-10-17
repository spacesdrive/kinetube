import { Badge } from '@/components/ui/badge';
import { InstagramIcon, YouTubeIcon } from './icons/BrandIcons';

import type { Platform } from '@shared/downloads.ts';

export interface PlatformBadgeProps {
  platform: Platform;
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (platform === 'instagram') {
    return (
      <Badge variant="secondary" className="gap-1 bg-gradient-to-r from-purple-100 to-pink-100 px-1.5 py-0 text-[10px] text-pink-600">
        <InstagramIcon className="h-2.5 w-2.5" />
        Instagram
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-red-50 px-1.5 py-0 text-[10px] text-red-600">
      <YouTubeIcon className="h-2.5 w-2.5" />
      YouTube
    </Badge>
  );
}
