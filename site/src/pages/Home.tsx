import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

import { Mark, Panel } from '@/components/brand';
import { GitHubIcon, InstagramIcon, YouTubeIcon } from '@/components/marks';
import { HeroWindow } from '@/components/mockups/HeroWindow';
import { Pill } from '@/components/Pill';
import { DOWNLOAD_URL, GITHUB_URL } from '@/lib/links';
import { usePageMeta } from '@/lib/seo';

// everything below the hero loads after it, so the first screen paints from the smallest bundle
const HomeBelow = lazy(() => import('./HomeBelow'));

const DESCRIPTION = 'kinetube is a free desktop app that downloads YouTube and Instagram media and turns it into text with Whisper. It all happens on your own computer.';

function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden pt-32 md:pt-40">
      <div className="container-page flex flex-col items-center text-center">
        <Mark size={44} className="brand-turn" />
        <h1 id="hero-heading" className="display rise-in mt-6 max-w-[15ch] text-[40px] leading-[46px] text-ink [--delay:80ms] sm:text-[52px] sm:leading-[58px] lg:text-[64px] lg:leading-[70px]">
          Your videos, saved and <span className="text-spin-text">transcribed.</span>
        </h1>
        <p className="rise-in mt-6 max-w-[40rem] text-lg leading-7 text-balance text-ink-muted [--delay:160ms]">{DESCRIPTION}</p>
        <div className="rise-in mt-9 flex w-full flex-col items-center justify-center gap-3 [--delay:240ms] sm:w-auto sm:flex-row">
          <Pill href={DOWNLOAD_URL} size="lg" className="w-full sm:w-auto">
            Download for Windows
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
          </Pill>
          <Pill href={GITHUB_URL} variant="soft" size="lg" className="w-full sm:w-auto">
            <GitHubIcon className="size-5" />
            View on GitHub
          </Pill>
        </div>
        <p className="rise-in mt-5 max-w-md text-sm text-ink-muted [--delay:300ms]">Free and open source, with no account to make. The macOS and Linux builds are not tested yet.</p>
        <div className="rise-in mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 [--delay:360ms]">
          <span className="label text-ink-muted">Works with</span>
          <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><YouTubeIcon className="size-5 text-youtube" />YouTube</span>
          <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><InstagramIcon className="size-5 text-instagram" />Instagram</span>
        </div>
      </div>

      <div className="container-page rise-in mt-14 [--delay:420ms] md:mt-16">
        <Panel placement="top-right" className="h-[27rem] rounded-t-panel px-3 pt-6 [mask-image:linear-gradient(to_bottom,black_80%,transparent)] sm:px-8 sm:pt-10 md:h-[38rem] lg:px-14 lg:pt-14">
          <HeroWindow className="mx-auto max-w-[68rem]" />
        </Panel>
      </div>
    </section>
  );
}

export default function Home() {
  usePageMeta({ title: 'kinetube', description: DESCRIPTION, path: '/' });
  return (
    <>
      <Hero />
      <Suspense fallback={<div className="min-h-[100svh]" />}>
        <HomeBelow />
      </Suspense>
    </>
  );
}
