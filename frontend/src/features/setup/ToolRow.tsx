import { CheckCircle, Download, MonitorCog, XCircle } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatBytes, formatSpeed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isActivePhase } from './toolSetupState';

import type { LucideIcon } from 'lucide-react';
import type { SetupToolId, ToolSetupState } from './toolSetupState';

export interface ToolRowProps {
  toolId: SetupToolId;
  state: ToolSetupState;
  delayMs: number;
}

const TOOL_INFO: Record<SetupToolId, { label: string; description: string; Icon: LucideIcon }> = {
  ytdlp: { label: 'yt-dlp', description: 'Downloads from YouTube and Instagram', Icon: Download },
  ffmpeg: { label: 'FFmpeg', description: 'Merges and converts audio and video', Icon: MonitorCog },
};

type Tone = 'waiting' | 'active' | 'done' | 'error';

const TONE_STYLES: Record<Tone, { icon: string; border: string; badge: string; bar: string }> = {
  waiting: { icon: 'bg-white/20', border: 'border-white/10', badge: 'bg-white/10 text-slate-300', bar: '[&>div]:bg-blue-500' },
  active: { icon: 'bg-blue-500', border: 'border-blue-400/30', badge: 'bg-blue-500/20 text-blue-300', bar: '[&>div]:bg-blue-500' },
  done: { icon: 'bg-emerald-500', border: 'border-emerald-400/30', badge: 'bg-emerald-500/20 text-emerald-300', bar: '[&>div]:bg-emerald-500' },
  error: { icon: 'bg-red-500', border: 'border-red-400/30', badge: 'bg-red-500/20 text-red-300', bar: '[&>div]:bg-red-500' },
};

const TONE_LABELS: Record<Tone, string> = { waiting: 'Waiting', active: 'Installing', done: 'Ready', error: 'Failed' };

function toneOf(phase: ToolSetupState['phase']): Tone {
  if (phase === 'done' || phase === 'error' || phase === 'waiting') return phase;
  return 'active';
}

function detailText({ phase, downloadedBytes, totalBytes, message }: ToolSetupState): string {
  if (phase === 'downloading' && totalBytes > 0) return `${formatBytes(downloadedBytes)} of ${formatBytes(totalBytes)}`;
  if (phase === 'waiting') return 'Waits for the step before it...';
  return message;
}

export default function ToolRow({ toolId, state, delayMs }: ToolRowProps) {
  const { label, description, Icon } = TOOL_INFO[toolId];
  const tone = toneOf(state.phase);
  const styles = TONE_STYLES[tone];
  const percent = Math.max(0, Math.min(100, state.percent));
  const isActive = isActivePhase(state.phase);

  return (
    <div className="animate-fade-slide-up opacity-0" style={{ animationDelay: `${delayMs}ms`, animationFillMode: 'both' }}>
      <div className={cn('rounded-2xl border bg-white/5 p-5 backdrop-blur-sm transition-all duration-500', styles.border)}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-white transition-all duration-500', styles.icon)}>
              {tone === 'done' && <span className="animate-check-pop"><CheckCircle size={20} /></span>}
              {tone === 'error' && <XCircle size={20} />}
              {(tone === 'waiting' || tone === 'active') && <Icon size={20} />}
            </div>
            <div>
              <p className="font-semibold leading-tight text-white">{label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', styles.badge)}>
            {isActive && <Spinner className="size-3" />}
            {TONE_LABELS[tone]}
          </span>
        </div>
        <Progress value={percent} className={cn('mb-2.5 h-2.5 bg-white/10', styles.bar)} />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{detailText(state)}</span>
          <span className="font-medium tabular-nums">{isActive ? formatSpeed(state.bytesPerSecond) : `${Math.round(percent)}%`}</span>
        </div>
      </div>
    </div>
  );
}
