import BrandMark from '@/components/shell/BrandMark';

import type { DownloadPlatformPage } from '@/lib/pages';

export interface LandingHeroProps {
  platform: DownloadPlatformPage;
}

const COPY: Record<DownloadPlatformPage, { title: string; description: string }> = {
  youtube: {
    title: 'What do you want to save?',
    description: 'Paste a link to a video, Shorts, a channel or a playlist. Everything downloads to this computer.',
  },
  instagram: {
    title: 'Save a reel or a post',
    description: 'Paste a link to a reel, a post, a story or a profile. Posts download without a login, and a saved login helps profiles load.',
  },
};

export default function LandingHero({ platform }: LandingHeroProps) {
  const { title, description } = COPY[platform];

  return (
    <div className="flex flex-col items-center text-center">
      <BrandMark className="mb-5 size-10 animate-spin-once" />
      <h1 className="text-hero text-ink">{title}</h1>
      <p className="mt-2.5 max-w-xl text-[15px] leading-6 text-ink-muted">{description}</p>
    </div>
  );
}
