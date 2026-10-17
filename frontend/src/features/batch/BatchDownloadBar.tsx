import { Download } from 'lucide-react';
import { useState } from 'react';

import QualitySelect from '@/components/QualitySelect';
import TranscribeToggle from '@/components/TranscribeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="sticky bottom-6 z-20 mt-4 shadow-xl">
      <CardContent className="space-y-2.5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">{pluralize(selectedCount, 'item')} selected</span>
          <div className="flex items-center gap-2">
            <QualitySelect value={quality} options={SHORT_QUALITY_LIST} onChange={setQuality} className="h-8 w-32 text-sm" />
            <Button type="button" size="sm" onClick={() => onDownload(quality, shouldTranscribe)}>
              <Download size={14} className="mr-1.5" />
              Download
            </Button>
          </div>
        </div>
        <TranscribeToggle id="batch-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
      </CardContent>
    </Card>
  );
}
