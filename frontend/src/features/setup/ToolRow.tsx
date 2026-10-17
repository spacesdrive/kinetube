import { CheckCircle2, Download, MonitorCog, XCircle } from 'lucide-react';

import StatusBadge from '@/components/patterns/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatBytes, formatSpeed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isActivePhase } from './toolSetupState';

import type { LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/components/patterns/StatusBadge';
import type { SetupToolId, ToolSetupState } from './toolSetupState';

export interface ToolRowProps {
  toolId: SetupToolId;
  state: ToolSetupState;
}

const TOOL_INFO: Record<SetupToolId, { label: string; description: string; Icon: LucideIcon }> = {
  ytdlp: { label: 'yt-dlp', description: 'Downloads from YouTube and Instagram', Icon: Download },
  ffmpeg: { label: 'FFmpeg', description: 'Merges and converts audio and video', Icon: MonitorCog },
};

type Tone = 'waiting' | 'active' | 'done' | 'error';

const TONE_BADGES: Record<Tone, { label: string; tone: StatusTone }> = {
  waiting: { label: 'Waiting', tone: 'neutral' },
  active: { label: 'Installing', tone: 'accent' },
  done: { label: 'Ready', tone: 'success' },
  error: { label: 'Failed', tone: 'error' },
};

const ICON_TONES: Record<Tone, string> = {
  waiting: 'bg-app text-ink',
  active: 'bg-app text-ink',
  done: 'bg-success-soft text-success',
  error: 'bg-error-soft text-error',
};

function toneOf(phase: ToolSetupState['phase']): Tone {
  if (phase === 'done' || phase === 'error' || phase === 'waiting') return phase;
  return 'active';
}

function detailText({ phase, downloadedBytes, totalBytes, message }: ToolSetupState): string {
  if (phase === 'downloading' && totalBytes > 0) return `${formatBytes(downloadedBytes)} of ${formatBytes(totalBytes)}`;
  if (phase === 'waiting') return 'Waits for the step before it...';
  return message;
}

export default function ToolRow({ toolId, state }: ToolRowProps) {
  const { label, description, Icon } = TOOL_INFO[toolId];
  const tone = toneOf(state.phase);
  const badge = TONE_BADGES[tone];
  const percent = Math.max(0, Math.min(100, state.percent));
  const isActive = isActivePhase(state.phase);

  return (
    <div className="rounded-card bg-surface p-5" aria-live="polite">
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-pill', ICON_TONES[tone])}>
          {tone === 'done' && <CheckCircle2 size={18} />}
          {tone === 'error' && <XCircle size={18} />}
          {(tone === 'waiting' || tone === 'active') && <Icon size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
        <StatusBadge tone={badge.tone} icon={isActive ? <Spinner /> : undefined}>{badge.label}</StatusBadge>
      </div>
      <Progress value={percent} aria-label={`${label} setup progress`} />
      <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
        <span className="truncate">{detailText(state)}</span>
        <span className="tabular-nums">{isActive ? formatSpeed(state.bytesPerSecond) : `${Math.round(percent)}%`}</span>
      </div>
    </div>
  );
}
