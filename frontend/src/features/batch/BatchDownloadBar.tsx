import { Download } from 'lucide-react';
import { useState } from 'react';

import QualitySelect from '@/components/QualitySelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { pluralize } from '@/lib/format';
import { SHORT_QUALITY_LIST } from '@/lib/qualities';

import type { VideoQuality } from '@shared/downloads.ts';

export interface BatchDownloadBarProps {
  selectedCount: number;
  defaultQuality: VideoQuality;
  onDownload(quality: VideoQuality, shouldTranscribe: boolean): void;
}

// stays at the bottom of the window while the person scrolls through long results
export default function BatchDownloadBar({ selectedCount, defaultQuality, onDownload }: BatchDownloadBarProps) {
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const [shouldTranscribe, setShouldTranscribe] = useState(false);

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-card bg-surface-elevated px-4 py-3 shadow-bar">
      <span className="flex-1 text-sm font-semibold text-ink">{pluralize(selectedCount, 'item')} selected</span>
      <span className="flex items-center gap-2">
        <Switch id="batch-transcribe" checked={shouldTranscribe} onCheckedChange={setShouldTranscribe} />
        <Label htmlFor="batch-transcribe" className="text-[13px] text-ink-muted">Transcribe</Label>
      </span>
      <QualitySelect value={quality} options={SHORT_QUALITY_LIST} onChange={setQuality} className="w-36" />
      <Button type="button" onClick={() => onDownload(quality, shouldTranscribe)}><Download /> Download</Button>
    </div>
  );
}
