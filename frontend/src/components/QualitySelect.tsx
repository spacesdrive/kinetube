import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUALITY_LABELS } from '@/lib/qualities';

import type { VideoQuality } from '@shared/downloads.ts';

export interface QualitySelectProps {
  value: VideoQuality;
  options: readonly VideoQuality[];
  onChange(quality: VideoQuality): void;
  className?: string;
}

export default function QualitySelect({ value, options, onChange, className }: QualitySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(quality) => {
        if (quality) onChange(quality);
      }}
    >
      <SelectTrigger aria-label="Quality" className={className}>
        <SelectValue>{QUALITY_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((quality) => (
          <SelectItem key={quality} value={quality}>{QUALITY_LABELS[quality]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
