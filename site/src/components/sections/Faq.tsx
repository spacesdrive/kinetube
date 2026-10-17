import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Link } from 'react-router';

// each answer comes from the README and the user guide, so the site and the docs never disagree
const QUESTIONS: { q: string; a: ReactNode }[] = [
  { q: 'Is kinetube free?', a: "Yes. It's open source under the MIT License, with no account and no subscription." },
  {
    q: 'Which systems does it run on?',
    a: (
      <>
        Windows is tested. The macOS and Linux builds come from the same release, but nobody has run them end to end on real hardware yet. The{' '}
        <Link to="/docs/reference/platforms" className="font-medium text-spin-text underline underline-offset-4">cross-platform status</Link> page lists what is known.
      </>
    ),
  },
  { q: 'Do I need an internet connection?', a: 'Yes, to download anything. The first start also needs one, because kinetube installs yt-dlp and FFmpeg then.' },
  { q: 'Does kinetube collect my data?', a: 'No. There is no server, no account and no analytics. It only connects to YouTube, Instagram and the hosts it installs tools and models from.' },
  { q: 'What do I need for Instagram profiles?', a: 'Python 3 on your computer. Posts and reels download without it.' },
];

function Question({ q, a, isOpen, onToggle }: { q: string; a: ReactNode; isOpen: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="rounded-card border border-line bg-surface-elevated">
      <h3>
        <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[17px] font-semibold text-ink">
          {q}
          {isOpen ? <Minus className="size-5 shrink-0 text-ink-muted" /> : <Plus className="size-5 shrink-0 text-ink-muted" />}
        </button>
      </h3>
      <div id={id} hidden={!isOpen} className="px-6 pb-5 text-base leading-7 text-ink-muted">{a}</div>
    </li>
  );
}

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto w-full max-w-3xl scroll-mt-24 px-4 py-24 md:py-32">
      <h2 id="faq-heading" className="display text-[32px] leading-[38px] text-ink md:text-[44px] md:leading-[50px]">Questions, answered</h2>
      <ul className="mt-8 flex flex-col gap-3">
        {QUESTIONS.map((item, index) => (
          <Question key={item.q} q={item.q} a={item.a} isOpen={open === index} onToggle={() => setOpen((current) => (current === index ? -1 : index))} />
        ))}
      </ul>
    </section>
  );
}
