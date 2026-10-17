import { Download, Mic, Music } from 'lucide-react';

import QualitySelect from '@/components/QualitySelect';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';

import type { VideoQuality } from '@shared/downloads.ts';

export interface SelectionBarProps {
  noun: string;
  selectedCount: number;
  targetCount: number;
  transcribeCount: number;
  quality: VideoQuality;
  qualities: readonly VideoQuality[];
  onQualityChange(quality: VideoQuality): void;
  onDownload(): void;
  // Instagram posts have no audio-only download, so the profile bar leaves this out
  onDownloadAudio?(): void;
}

// floats at the bottom of the scrolling list, so the action stays in reach however far the person scrolls
export default function SelectionBar(props: SelectionBarProps) {
  const { noun, selectedCount, targetCount, transcribeCount, quality, qualities, onDownloadAudio } = props;
  const summary = selectedCount > 0 ? `${pluralize(selectedCount, noun)} selected` : `All ${pluralize(targetCount, noun)}`;

  return (
    <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-card bg-surface-elevated px-4 py-3 shadow-bar">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{summary}</p>
        {transcribeCount > 0 && <p className="mt-0.5 flex items-center gap-1 text-xs text-spin-text"><Mic size={12} /> {transcribeCount} to transcribe</p>}
      </div>
      <QualitySelect value={quality} options={qualities} onChange={props.onQualityChange} className="w-40" />
      {onDownloadAudio && (
        <Button type="button" variant="outline" disabled={targetCount === 0} onClick={onDownloadAudio}><Music /> MP3</Button>
      )}
      <Button type="button" disabled={targetCount === 0} onClick={props.onDownload}><Download /> Download {targetCount > 0 ? targetCount : ''}</Button>
    </div>
  );
}
