import StatusBadge from '@/components/patterns/StatusBadge';
import { InstagramIcon, YouTubeIcon } from './icons/BrandIcons';

import type { Platform } from '@shared/downloads.ts';

export interface PlatformBadgeProps {
  platform: Platform;
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  const isInstagram = platform === 'instagram';
  return (
    <StatusBadge icon={isInstagram ? <InstagramIcon /> : <YouTubeIcon />}>
      {isInstagram ? 'Instagram' : 'YouTube'}
    </StatusBadge>
  );
}
