import { Download, Mic, Music } from 'lucide-react';

import QualitySelect from '@/components/QualitySelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { pluralize } from '@/lib/format';
import { VIDEO_QUALITIES } from '@/lib/qualities';

import type { VideoQuality } from '@shared/downloads.ts';

export interface ChannelToolbarProps {
  isAllSelected: boolean;
  selectedCount: number;
  transcribeCount: number;
  downloadCount: number;
  quality: VideoQuality;
  onToggleAll(): void;
  onQualityChange(quality: VideoQuality): void;
  onDownloadVideos(): void;
  onDownloadAudio(): void;
}

export default function ChannelToolbar(props: ChannelToolbarProps) {
  const { isAllSelected, selectedCount, transcribeCount, downloadCount, quality, onToggleAll, onQualityChange, onDownloadVideos, onDownloadAudio } = props;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} />
          {isAllSelected ? 'Clear selection' : 'Select all'}
        </label>
        {selectedCount > 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-600">{selectedCount} selected</Badge>}
        {transcribeCount > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-purple-600"><Mic size={13} /> {transcribeCount} to transcribe</span>
        )}

        <div className="flex-1" />
        <QualitySelect value={quality} options={VIDEO_QUALITIES} onChange={onQualityChange} className="w-44" />
        <Button type="button" size="sm" onClick={onDownloadVideos} disabled={downloadCount === 0}>
          <Download size={15} className="mr-1.5" />
          Download {pluralize(downloadCount, 'video')}
        </Button>
        <Button type="button" size="sm" onClick={onDownloadAudio} disabled={downloadCount === 0} className="bg-purple-600 text-white hover:bg-purple-700">
          <Music size={15} className="mr-1.5" />
          {downloadCount} as MP3
        </Button>
      </CardContent>
    </Card>
  );
}
