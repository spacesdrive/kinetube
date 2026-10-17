import { QUALITY_LABELS, qualityNeedsFfmpeg, VIDEO_QUALITIES } from '@/lib/qualities';
import { cn } from '@/lib/utils';

import type { VideoQuality } from '@shared/downloads.ts';

export interface QualityGridProps {
  value: VideoQuality;
  isFfmpegInstalled: boolean;
  onChange(quality: VideoQuality): void;
}

function buttonClass(isSelected: boolean, isUnavailable: boolean): string {
  if (isSelected) return 'border-blue-500 bg-blue-50 text-blue-700';
  if (isUnavailable) return 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60';
  return 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50/50';
}

export default function QualityGrid({ value, isFfmpegInstalled, onChange }: QualityGridProps) {
  return (
    <div role="radiogroup" aria-label="Quality" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {VIDEO_QUALITIES.map((quality) => {
        const needsFfmpeg = qualityNeedsFfmpeg(quality);
        const isUnavailable = needsFfmpeg && !isFfmpegInstalled;
        return (
          <button
            key={quality}
            type="button"
            role="radio"
            aria-checked={value === quality}
            disabled={isUnavailable}
            onClick={() => onChange(quality)}
            className={cn('relative rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition-all', buttonClass(value === quality, isUnavailable))}
          >
            {QUALITY_LABELS[quality]}
            {needsFfmpeg && <span className="mt-0.5 block text-xs font-normal opacity-70">{isUnavailable ? 'Needs FFmpeg' : 'Uses FFmpeg'}</span>}
          </button>
        );
      })}
    </div>
  );
}
