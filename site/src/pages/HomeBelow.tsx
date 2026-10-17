import { MotionConfig } from 'motion/react';

import { AccountsMock, PostMock, ProfileMock, TwoFactorMock } from '@/components/mockups/bento/InstagramMocks';
import { BatchMock, FileNamesMock, PaletteMock, ResumeMock, ThemesMock, UpdatesMock } from '@/components/mockups/bento/DetailMocks';
import { DownloadCard } from '@/components/mockups/DownloadCard';
import { SetupCard } from '@/components/mockups/SetupCard';
import { TranscribeCard } from '@/components/mockups/TranscribeCard';
import { BentoCard, CtaBand, FeatureSection, SectionHeader } from '@/components/sections/blocks';
import { Faq } from '@/components/sections/Faq';
import { RealApp } from '@/components/sections/RealApp';
import { Story } from '@/components/sections/story/Story';
import { DOWNLOAD_URL, GITHUB_URL } from '@/lib/links';

const GRID_SECTION = 'container-page flex scroll-mt-24 flex-col gap-8 py-24 md:gap-12 md:py-32';

// the home page below the hero, in the order of the Activepieces home page
export default function HomeBelow() {
  return (
    // every animation below follows the reader's reduced motion setting
    <MotionConfig reducedMotion="user">
      <Story />

      <CtaBand
        title="Paste a link. Get the file."
        text="Pick the quality you want, and kinetube saves it to your download folder."
        primary={{ label: 'Download for Windows', href: DOWNLOAD_URL }}
        secondary={{ label: 'Read the docs', href: '/docs' }}
      />

      <FeatureSection
        id="youtube"
        title="Download from YouTube"
        lead="Paste a link to a video, a Short, a playlist or a whole channel. Pick a quality up to 4K and press Download."
        notes={[
          { title: 'Only real qualities', text: 'The list shows the qualities each video really has.' },
          { title: 'Audio when you want it', text: 'Any video can be saved as an MP3.' },
          { title: 'Playlists and channels', text: 'Tick the videos you want. Live, upcoming and private ones are marked.' },
        ]}
      >
        <DownloadCard />
      </FeatureSection>

      <FeatureSection
        id="transcribe"
        title="Turn speech into text"
        lead="whisper.cpp runs on your own computer, so your files never leave it. Pick a model and a language, or let it detect one."
        tone="soft"
        placement="bottom-left"
        notes={[
          { title: 'Five models', text: 'From Tiny, about 75 MB, to Large, about 2.9 GB. Larger models are more accurate, but slower.' },
          { title: 'Twelve languages', text: 'Or let Whisper work out the language for you.' },
          { title: 'Transcribe after download', text: 'Turn on one switch and every finished download gets a text file next to it.' },
        ]}
      >
        <TranscribeCard />
      </FeatureSection>

      <section id="details" aria-labelledby="details-heading" className={GRID_SECTION}>
        <SectionHeader id="details-heading" title="Small things that save time" />
        <div className="grid gap-5 md:grid-cols-2">
          <BentoCard title="Pause and resume" text="Stop a download and pick it up later, even after the app closes." tone="soft"><ResumeMock /></BentoCard>
          <BentoCard title="Batch download" text="Paste many links, one per line, and download them in one run." placement="bottom-left"><BatchMock /></BentoCard>
        </div>
        <div className="grid gap-5 md:grid-cols-[5fr_8fr]">
          <BentoCard title="Command palette" text="Press Ctrl K to jump to a page, switch the theme or paste a link." placement="bottom-left"><PaletteMock /></BentoCard>
          <BentoCard title="File names" text="Add a prefix, a suffix or a number, or write your own yt-dlp template." tone="soft"><FileNamesMock /></BentoCard>
        </div>
        <div className="grid gap-5 md:grid-cols-[8fr_5fr]">
          <BentoCard title="Updates" text="kinetube tells you when a new version of the app or yt-dlp is out, and installs it when you say so." tone="soft" placement="bottom-left"><UpdatesMock /></BentoCard>
          <BentoCard title="Light and dark" text="Follow your system, or pick one."><ThemesMock /></BentoCard>
        </div>
      </section>

      <RealApp />

      <FeatureSection
        id="tools"
        title="Built on open-source tools"
        lead="yt-dlp downloads, FFmpeg merges and converts, whisper.cpp transcribes and instaloader reads Instagram. kinetube installs them for you."
        placement="top-left"
        notes={[
          { title: 'Ready on first start', text: 'yt-dlp and FFmpeg install the first time you open the app. Whisper and instaloader wait until you need them.' },
          { title: 'Updates on your terms', text: 'Nothing updates until you choose.' },
          { title: 'Open source', text: 'kinetube is MIT licensed. You can read every line on GitHub.' },
        ]}
      >
        <SetupCard />
      </FeatureSection>

      <CtaBand
        title="Read every line."
        text="kinetube is open source under the MIT License. Bug reports, ideas and pull requests are welcome."
        primary={{ label: 'View on GitHub', href: GITHUB_URL }}
        secondary={{ label: 'How to contribute', href: '/docs/contribute/contributing' }}
      />

      <section id="instagram" aria-labelledby="instagram-heading" className={GRID_SECTION}>
        <SectionHeader id="instagram-heading" title="Instagram too" lead="Posts, reels, stories and whole profiles, with your logins kept on your computer." />
        <div className="grid gap-5 md:grid-cols-2">
          <BentoCard title="Posts, reels and stories" text="Paste a link and download it." tone="soft"><PostMock /></BentoCard>
          <BentoCard title="Whole profiles" text="Open a profile, load up to 500 posts and pick the ones you want." placement="bottom-left"><ProfileMock /></BentoCard>
          <BentoCard title="Two-factor login" text="Log in with two-factor authentication." placement="bottom-left"><TwoFactorMock /></BentoCard>
          <BentoCard title="More than one account" text="Keep several accounts and switch between them." tone="soft"><AccountsMock /></BentoCard>
        </div>
      </section>

      <Faq />
    </MotionConfig>
  );
}
