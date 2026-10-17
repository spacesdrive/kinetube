import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Download, LoaderCircle } from 'lucide-react';

import { useAutoplay } from '@/hooks/useAutoplay';
import { cn } from '@/lib/cn';

import { CountUp } from './CountUp';
import { Cursor } from './Cursor';
import { Bar, PanelCard, Thumbnail } from './kit';
import { SWAP } from './motion';
import { VIDEO } from './sample';
import { Typed } from './Typed';

// how long each moment holds, in seconds
const STEPS = [0.6, 0.8, 1.7, 0.8, 1.0, 1.3, 0.8, 0.6, 0.8, 2.6, 1.0, 3.4] as const;
const PHASE = { atLink: 1, typeLink: 2, atFetch: 3, fetch: 4, loaded: 5, atQuality: 6, pickQuality: 7, atDownload: 8, download: 9, merge: 10, complete: 11 } as const;
const CLICKS: readonly number[] = [PHASE.typeLink, PHASE.fetch, PHASE.pickQuality, PHASE.download];
const TARGETS: Record<number, string> = {
  [PHASE.atLink]: 'link',
  [PHASE.typeLink]: 'link',
  [PHASE.atFetch]: 'fetch',
  [PHASE.fetch]: 'fetch',
  [PHASE.atQuality]: 'quality',
  [PHASE.pickQuality]: 'quality',
  [PHASE.atDownload]: 'download',
  [PHASE.download]: 'download',
};

const ROWS = ['Best available', '4K (2160p)', '1080p Full HD', '720p HD'] as const;
const PICKED = 2;

function QualityRow({ quality, isSelected, isTarget }: { quality: string; isSelected: boolean; isTarget: boolean }) {
  return (
    <li data-cursor={isTarget ? 'quality' : undefined} className={cn('flex items-center gap-2.5 rounded-row px-2.5 py-2 text-[13px] transition-colors duration-300', isSelected ? 'bg-spin-soft font-semibold text-ink' : 'text-ink-muted')}>
      <span className={cn('grid size-4 place-items-center rounded-full border transition-colors duration-300', isSelected ? 'border-spin bg-spin' : 'border-line-strong')}>
        {isSelected && <Check className="size-3 text-on-spin" strokeWidth={3} />}
      </span>
      {quality}
      <span className="ml-auto text-[11px] font-normal text-ink-muted">Merged with FFmpeg</span>
    </li>
  );
}

function Progress({ phase, loop }: { phase: number; loop: number }) {
  const isRunning = phase >= PHASE.download;
  return (
    <div className="mt-3 h-12">
      <AnimatePresence mode="wait" initial={false}>
        {phase >= PHASE.complete ? (
          <motion.div key="done" className="flex items-center gap-2.5" {...SWAP}>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success"><Check className="size-3.5" />Complete</span>
            <span className="truncate text-xs text-ink-muted">{VIDEO.title}</span>
          </motion.div>
        ) : isRunning ? (
          <motion.div key={`run-${loop}`} {...SWAP}>
            <span className="block h-1.5 overflow-hidden rounded-full bg-surface">
              <motion.span className="block h-full rounded-full bg-spin" initial={{ width: '0%' }} animate={{ width: phase >= PHASE.merge ? '100%' : '92%' }} transition={{ duration: phase >= PHASE.merge ? 0.5 : 2.4, ease: 'easeOut' }} />
            </span>
            <p className="mt-2 flex justify-between font-mono text-[11px] text-ink-muted">
              {phase >= PHASE.merge ? <span>Merging...</span> : <span><CountUp value={92} isActive duration={2.4} suffix="%" /> · 18.6 MB/s</span>}
              <span>{phase >= PHASE.merge ? '' : '0:04 left'}</span>
            </p>
          </motion.div>
        ) : (
          <motion.p key="idle" className="pt-1 text-[11px] text-ink-muted" {...SWAP}>Saved to your download folder when it finishes.</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// a video download clicked through by a cursor: paste the link, Fetch, pick 1080p, Download, then Complete
export function DownloadCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, loop, reduce } = useAutoplay(ref, STEPS);
  const isLoaded = phase >= PHASE.loaded;
  const selected = phase >= PHASE.pickQuality ? PICKED : 0;
  const target = reduce ? null : (TARGETS[phase] ?? null);
  const clicks = loop * CLICKS.length + CLICKS.filter((step) => phase >= step).length;

  return (
    <div ref={ref} role="img" aria-label="Downloading a YouTube video in kinetube: the link is pasted, Fetch reads it, 1080p Full HD is picked, and the download runs to Complete." className="relative w-full max-w-[34rem]">
      <PanelCard className="flex h-[28rem] flex-col p-5">
        <div className="flex gap-2">
          <p data-cursor="link" className={cn('flex h-10 min-w-0 flex-1 items-center rounded-full border px-4 font-mono text-[11px] transition-colors duration-300', phase >= PHASE.typeLink && phase < PHASE.loaded ? 'border-ink-muted text-ink' : 'border-line text-ink-muted')}>
            <span className="truncate">{phase >= PHASE.typeLink ? <Typed key={loop} text={VIDEO.url} isActive speed={40} /> : 'Paste a YouTube link'}</span>
          </p>
          <motion.span data-cursor="fetch" className="flex h-10 items-center gap-1.5 rounded-full bg-spin px-4 text-xs font-semibold text-on-spin" animate={{ scale: phase === PHASE.fetch ? [1, 0.95, 1] : 1 }} transition={{ duration: 0.26 }}>
            {phase === PHASE.fetch && <LoaderCircle className="size-3.5 animate-spin" />}
            Fetch
          </motion.span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoaded ? (
            <motion.div key="video" className="mt-4 flex gap-3" {...SWAP}>
              <Thumbnail src={VIDEO.thumbnail} className="h-[4.5rem] w-32 shrink-0" length={VIDEO.length} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-ink">{VIDEO.title}</p>
                <p className="mt-1 text-xs text-ink-muted">{VIDEO.channel} · {VIDEO.length}</p>
                <p className="mt-1 text-xs text-ink-muted">Up to 2160p on YouTube</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" className="mt-4 flex gap-3" {...SWAP}>
              <span className="h-[4.5rem] w-32 shrink-0 rounded-row bg-surface" />
              <div className="flex flex-1 flex-col justify-center gap-2"><Bar className="w-3/4" /><Bar className="w-1/2" /></div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex gap-4 border-b border-line text-xs">
          <span className="border-b-2 border-spin pb-2 font-semibold text-ink">Video and audio</span>
          <span className="pb-2 text-ink-muted">Audio only</span>
        </div>
        <ul className={cn('mt-2 flex flex-col gap-0.5 transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-40')}>
          {ROWS.map((quality, index) => <QualityRow key={quality} quality={quality} isSelected={isLoaded && index === selected} isTarget={index === PICKED} />)}
        </ul>

        <motion.span data-cursor="download" className={cn('mt-auto flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-colors duration-300', isLoaded ? 'bg-spin text-on-spin' : 'bg-surface text-ink-muted')} animate={{ scale: phase === PHASE.download ? [1, 0.96, 1] : 1 }} transition={{ duration: 0.26 }}>
          <Download className="size-4" />
          Download {ROWS[selected]}
        </motion.span>
        <Progress phase={phase} loop={loop} />
      </PanelCard>
      <Cursor stage={ref} target={target} clicks={clicks} />
    </div>
  );
}
