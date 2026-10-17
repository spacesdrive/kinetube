import { Check } from 'lucide-react';

import { isQualityOffered, QUALITY_LABELS, qualityNeedsFfmpeg, VIDEO_QUALITIES } from '@/lib/qualities';
import { cn } from '@/lib/utils';

import type { VideoQuality } from '@shared/downloads.ts';

export interface QualityOptionsProps {
  value: VideoQuality;
  maxHeight: number | null;
  isFfmpegInstalled: boolean;
  onChange(quality: VideoQuality): void;
}

function hintFor(quality: VideoQuality, isOffered: boolean, isFfmpegInstalled: boolean): string | null {
  if (!isOffered) return 'Not offered by this video';
  if (!qualityNeedsFfmpeg(quality)) return null;
  return isFfmpegInstalled ? 'Merged with FFmpeg' : 'Needs FFmpeg';
}

export default function QualityOptions({ value, maxHeight, isFfmpegInstalled, onChange }: QualityOptionsProps) {
  return (
    <div role="radiogroup" aria-label="Quality" className="-mx-1.5 space-y-0.5">
      {VIDEO_QUALITIES.map((quality) => {
        const isOffered = isQualityOffered(quality, maxHeight);
        const isBlocked = !isOffered || (qualityNeedsFfmpeg(quality) && !isFfmpegInstalled);
        const isSelected = value === quality;
        const hint = hintFor(quality, isOffered, isFfmpegInstalled);
        return (
          <button
            key={quality}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isBlocked}
            onClick={() => onChange(quality)}
            className={cn(
              'flex w-full items-center gap-3 rounded-row px-2.5 py-2 text-left transition-quiet disabled:cursor-not-allowed disabled:opacity-45',
              isSelected ? 'bg-spin-soft' : 'hover:bg-surface-hover',
            )}
          >
            <span className={cn('flex size-4 flex-shrink-0 items-center justify-center rounded-pill border', isSelected ? 'border-spin bg-spin text-on-spin' : 'border-line-strong')}>
              {isSelected && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="flex-1 text-sm font-medium text-ink">{QUALITY_LABELS[quality]}</span>
            {hint && <span className="text-xs text-ink-faint">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
