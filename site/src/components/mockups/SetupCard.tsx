import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, LoaderCircle } from 'lucide-react';

import { Mark } from '@/components/brand';
import { useAutoplay } from '@/hooks/useAutoplay';
import { cn } from '@/lib/cn';

import { PanelCard } from './kit';
import { SWAP } from './motion';

const STEPS = [0.9, 2.4, 2.6, 0.8, 3.2] as const;

type ToolStatus = 'Waiting' | 'Installing' | 'Ready';

// the first-start screen in the app's own words (frontend/src/features/setup)
const TOOLS = [
  { name: 'yt-dlp', role: 'Downloads from YouTube and Instagram', installsAt: 1 },
  { name: 'FFmpeg', role: 'Merges and converts audio and video', installsAt: 2 },
];

function statusOf(installsAt: number, phase: number): ToolStatus {
  if (phase > installsAt) return 'Ready';
  return phase === installsAt ? 'Installing' : 'Waiting';
}

const BADGE: Record<ToolStatus, string> = {
  Waiting: 'bg-surface text-ink-muted',
  Installing: 'bg-info-soft text-info',
  Ready: 'bg-success-soft text-success',
};

function ToolRow({ name, role, status, loop }: { name: string; role: string; status: ToolStatus; loop: number }) {
  const Icon = status === 'Ready' ? Check : status === 'Installing' ? LoaderCircle : Clock;
  return (
    <li className="rounded-control border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-muted">{role}</p>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={status} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', BADGE[status])} {...SWAP}>
            <Icon className={cn('size-3.5', status === 'Installing' && 'animate-spin')} />
            {status}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface">
        <motion.span key={`${name}-${loop}`} className="block h-full rounded-full bg-spin" initial={{ width: '0%' }} animate={{ width: status === 'Waiting' ? '0%' : status === 'Ready' ? '100%' : '82%' }} transition={{ duration: status === 'Installing' ? 2.2 : 0.4, ease: 'easeOut' }} />
      </span>
    </li>
  );
}

// the setup screen on first start: yt-dlp, then FFmpeg, install one after the other, then the app opens
export function SetupCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, loop } = useAutoplay(ref, STEPS);
  const isDone = phase >= STEPS.length - 1;

  return (
    <div ref={ref} role="img" aria-label="The kinetube setup screen on first start: yt-dlp installs, then FFmpeg, and both show Ready before the app opens." className="relative w-full max-w-[34rem]">
      <PanelCard className="flex h-[28rem] flex-col p-6">
        <Mark size={36} />
        <p className="mt-4 text-lg font-semibold text-ink">Setting up kinetube</p>
        <p className="mt-1 text-sm text-ink-muted">Downloading the tools kinetube needs. This happens only once.</p>
        <ul className="mt-5 flex flex-col gap-3">
          {TOOLS.map((tool) => <ToolRow key={tool.name} name={tool.name} role={tool.role} status={statusOf(tool.installsAt, phase)} loop={loop} />)}
        </ul>
        <div className="mt-auto h-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={isDone ? 'done' : 'wait'} className={cn('flex items-center gap-2 text-sm', isDone ? 'font-semibold text-success' : 'text-ink-muted')} {...SWAP}>
              {isDone ? <><Check className="size-4" />All set. Opening the app...</> : 'Keep this window open while setup runs.'}
            </motion.p>
          </AnimatePresence>
        </div>
      </PanelCard>
    </div>
  );
}
