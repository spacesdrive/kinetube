import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, FileAudio, LoaderCircle, Upload } from 'lucide-react';

import { useAutoplay } from '@/hooks/useAutoplay';
import { cn } from '@/lib/cn';

import { CountUp } from './CountUp';
import { Cursor } from './Cursor';
import { Bar, PanelCard } from './kit';
import { POP, SWAP } from './motion';
import { Typed } from './Typed';

const STEPS = [0.6, 0.8, 1.0, 0.8, 0.7, 0.8, 0.6, 0.8, 0.6, 2.2, 4.6] as const;
const PHASE = { atDrop: 1, drop: 2, atModel: 3, openModel: 4, atBase: 5, pickBase: 6, atTranscribe: 7, transcribe: 8, working: 9, done: 10 } as const;
const CLICKS: readonly number[] = [PHASE.drop, PHASE.openModel, PHASE.pickBase, PHASE.transcribe];
const TARGETS: Record<number, string> = {
  [PHASE.atDrop]: 'drop',
  [PHASE.drop]: 'drop',
  [PHASE.atModel]: 'model',
  [PHASE.openModel]: 'model',
  [PHASE.atBase]: 'base',
  [PHASE.pickBase]: 'base',
  [PHASE.atTranscribe]: 'transcribe',
  [PHASE.transcribe]: 'transcribe',
};

// the app's own model list (backend/src/managers/whisper/whisperModels.ts)
const MODELS = ['Tiny (~75 MB)', 'Base (~142 MB)', 'Small (~466 MB)', 'Medium (~1.5 GB)', 'Large (~2.9 GB)'] as const;
const PICKED = 1;
const TRANSCRIPT = "Thanks for joining us. Today we're looking at how a small team plans a release: what goes in, what waits, and how we decide when it's ready to ship.";

function Field({ label, value, cursor, isOpen }: { label: string; value: string; cursor?: string; isOpen?: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-ink">{label}</p>
      <p data-cursor={cursor} className={cn('mt-1 flex h-9 items-center justify-between gap-2 rounded-control border px-3 text-xs transition-colors duration-300', isOpen ? 'border-ink-muted text-ink' : 'border-line text-ink')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={value} className="truncate" {...SWAP}>{value}</motion.span>
        </AnimatePresence>
        <ChevronDown className="size-3.5 shrink-0 text-ink-muted" />
      </p>
    </div>
  );
}

function QueueItem({ phase }: { phase: number }) {
  const isDone = phase >= PHASE.done;
  const isWorking = phase >= PHASE.transcribe && !isDone;
  return (
    <motion.div className="mt-3 flex items-center gap-3 rounded-control border border-line px-3 py-2.5" {...SWAP}>
      <FileAudio className="size-4 shrink-0 text-ink-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-ink">interview.mp4</p>
        <p className="text-[11px] text-ink-muted">
          {isDone ? <><CountUp value={248} isActive /> words</> : isWorking ? 'Transcribing' : 'Waiting'}
        </p>
      </div>
      {isDone ? <Check className="size-4 text-success" /> : isWorking ? <LoaderCircle className="size-4 animate-spin text-spin-text" /> : null}
    </motion.div>
  );
}

// a file transcribed on the computer, clicked through by a cursor: add it, pick Base, Transcribe, read the text
export function TranscribeCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, loop, reduce } = useAutoplay(ref, STEPS);
  const isModelOpen = phase === PHASE.openModel || phase === PHASE.atBase;
  const target = reduce ? null : (TARGETS[phase] ?? null);
  const clicks = loop * CLICKS.length + CLICKS.filter((step) => phase >= step).length;

  return (
    <div ref={ref} role="img" aria-label="Transcribing a file in kinetube: interview.mp4 is added, the Base Whisper model is picked, Transcribe is pressed, and the transcript appears." className="relative w-full max-w-[34rem]">
      <PanelCard className="flex h-[28rem] flex-col p-5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-ink">Transcribe</p>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted">On this computer</span>
        </div>
        <p data-cursor="drop" className={cn('mt-3 flex h-12 items-center justify-center gap-2 rounded-control border border-dashed text-xs transition-colors duration-300', phase >= PHASE.drop ? 'border-line text-ink-muted' : 'border-line-strong text-ink')}>
          <Upload className="size-4" />
          Drop files here, or select to browse
        </p>

        <div className="relative mt-3 flex gap-3">
          <Field label="Whisper model" value={MODELS[phase >= PHASE.pickBase ? PICKED : 0]} cursor="model" isOpen={isModelOpen} />
          <Field label="Language" value="Detect automatically" />
          <AnimatePresence>
            {isModelOpen && (
              <motion.ul className="absolute top-full left-0 z-20 mt-1.5 flex w-[calc(50%-6px)] flex-col gap-0.5 rounded-control bg-surface-elevated p-1.5 shadow-popover" style={{ transformOrigin: 'top center' }} {...POP}>
                {MODELS.map((model, index) => (
                  <li key={model} data-cursor={index === PICKED ? 'base' : undefined} className={cn('rounded-row px-2.5 py-1.5 text-xs', index === PICKED && phase === PHASE.atBase ? 'bg-surface-hover text-ink' : 'text-ink-muted')}>{model}</li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">Larger models are more accurate, but slower.</p>

        <motion.span data-cursor="transcribe" className="mt-3 flex h-9 items-center justify-center rounded-full bg-spin text-xs font-semibold text-on-spin" animate={{ scale: phase === PHASE.transcribe ? [1, 0.96, 1] : 1 }} transition={{ duration: 0.26 }}>
          Transcribe
        </motion.span>

        <AnimatePresence initial={false}>{phase >= PHASE.drop && <QueueItem key={`item-${loop}`} phase={phase} />}</AnimatePresence>

        <div className="mt-3 min-h-0 flex-1 rounded-control bg-surface p-3">
          <p className="label text-[10px] text-ink-muted">Transcript</p>
          {phase >= PHASE.done ? (
            <p className="mt-1.5 text-[13px] leading-5 text-ink"><Typed key={loop} text={TRANSCRIPT} isActive speed={60} /></p>
          ) : (
            <div className="mt-3 flex flex-col gap-2"><Bar className="w-11/12" /><Bar className="w-4/5" /><Bar className="w-2/3" /></div>
          )}
        </div>
      </PanelCard>
      <Cursor stage={ref} target={target} clicks={clicks} />
    </div>
  );
}
