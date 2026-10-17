import { Check } from 'lucide-react';
import { Link } from 'react-router';

import { CHANGELOG_URL, DOWNLOAD_URL, GITHUB_URL, LICENSE_URL, ROADMAP_URL } from '@/lib/links';

import { Logo, Panel } from './brand';
import { Pill } from './Pill';

interface FooterLink {
  label: string;
  href: string;
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'YouTube', href: '/#youtube' },
      { label: 'Transcription', href: '/#transcribe' },
      { label: 'Instagram', href: '/#instagram' },
      { label: 'Download', href: DOWNLOAD_URL },
    ],
  },
  {
    heading: 'Docs',
    links: [
      { label: 'Install', href: '/docs/install' },
      { label: 'User guide', href: '/docs' },
      { label: 'Privacy', href: '/docs/reference/privacy' },
      { label: 'Cross-platform status', href: '/docs/reference/platforms' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Changelog', href: CHANGELOG_URL },
      { label: 'Roadmap', href: ROADMAP_URL },
      { label: 'MIT License', href: LICENSE_URL },
    ],
  },
];

const TICKS = ['Free', 'No account', 'Open source'];

function FooterAnchor({ link }: { link: FooterLink }) {
  const classes = 'text-[15px] text-ink-muted transition-colors hover:text-ink';
  if (link.href.startsWith('/')) return <Link to={link.href} className={classes}>{link.label}</Link>;
  return <a href={link.href} target="_blank" rel="noopener noreferrer" className={classes}>{link.label}</a>;
}

// a full-width closing call to action, then a card of link columns overlapping its lower edge
export function Footer() {
  return (
    <footer className="mt-24">
      <Panel placement="bottom-left" className="pb-10">
        <div className="container-page flex flex-col items-center py-24 text-center md:py-32">
          <h2 className="display text-[44px] leading-[50px] text-on-deep md:text-[64px] md:leading-[70px]">
            Keep it <span className="text-on-deep-accent">moving.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-7 text-on-deep-muted">Download kinetube, paste a link and get your file.</p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Pill href={DOWNLOAD_URL} size="lg" className="w-full sm:w-auto">Download for Windows</Pill>
            <Pill href={GITHUB_URL} size="lg" variant="soft" className="w-full sm:w-auto">View on GitHub</Pill>
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-on-deep-muted">
            {TICKS.map((tick) => (
              <li key={tick} className="flex items-center gap-1.5">
                <Check className="size-4" />
                {tick}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="bg-app pb-10">
        <div className="container-page">
          <div className="relative -mt-10 rounded-card border border-line bg-surface-elevated px-6 py-10 md:px-12">
            <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
              <div className="flex flex-col gap-3">
                <Logo size={28} />
                <p className="max-w-xs text-[15px] leading-6 text-ink-muted">Save YouTube and Instagram media, then turn it into text. All on your own computer.</p>
              </div>
              {COLUMNS.map((column) => (
                <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3">
                  <p className="label text-ink-muted">{column.heading}</p>
                  <ul className="flex flex-col gap-2.5">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <FooterAnchor link={link} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
            <div className="mt-10 border-t border-line pt-6 text-[13px] text-ink-muted">
              <p>&copy; {new Date().getFullYear()} kinetube. Released under the MIT License.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
