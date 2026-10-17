import type { DownloadPlatformPage } from '@/lib/pages';

export interface DownloadHeroProps {
  platform: DownloadPlatformPage;
}

export default function DownloadHero({ platform }: DownloadHeroProps) {
  if (platform === 'instagram') {
    return (
      <div className="mx-auto mb-8 mt-10 w-full max-w-2xl text-center">
        <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
          Download Instagram <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">reels and posts</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground md:text-lg">Save reels, posts and stories. Log in from the sidebar to reach private content.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto mb-8 mt-10 w-full max-w-2xl text-center">
      <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
        Download YouTube <span className="text-blue-600">in high definition</span>
      </h1>
      <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground md:text-lg">Free, and it runs entirely on your computer. Nothing you download leaves it.</p>
    </div>
  );
}
