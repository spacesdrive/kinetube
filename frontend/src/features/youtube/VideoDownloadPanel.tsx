import { Download, Music } from 'lucide-react';
import { useState } from 'react';

import DetailPanel from '@/components/patterns/DetailPanel';
import Notice from '@/components/patterns/Notice';
import StatusBadge from '@/components/patterns/StatusBadge';
import TranscribeToggle from '@/components/TranscribeToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isQualityOffered, QUALITY_LABELS, qualityNeedsFfmpeg, tallestHeight } from '@/lib/qualities';
import QualityOptions from './QualityOptions';

import type { VideoQuality } from '@shared/downloads.ts';
import type { YouTubeVideo } from '@shared/youtube.ts';
import type { MediaDownloadRequest } from '../downloads/downloadRequests';

export interface VideoDownloadPanelProps {
  video: YouTubeVideo;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
  onDownload(request: MediaDownloadRequest): void;
}

type DownloadKind = 'video' | 'audio';

// the saved default only applies when this video offers it; otherwise "Best available" is the safe start
function startingQuality(defaultQuality: VideoQuality, maxHeight: number | null): VideoQuality {
  return isQualityOffered(defaultQuality, maxHeight) ? defaultQuality : 'best';
}

export default function VideoDownloadPanel({ video, defaultQuality, isFfmpegInstalled, onDownload }: VideoDownloadPanelProps) {
  const maxHeight = tallestHeight(video.videoFormats.map((format) => format.height));
  const [kind, setKind] = useState<DownloadKind>('video');
  const [quality, setQuality] = useState<VideoQuality>(() => startingQuality(defaultQuality, maxHeight));
  const [shouldTranscribe, setShouldTranscribe] = useState(false);
  const isBlocked = kind === 'video' && qualityNeedsFfmpeg(quality) && !isFfmpegInstalled;

  function handleDownload() {
    const isAudioOnly = kind === 'audio';
    onDownload({ url: video.url, title: video.title, quality: isAudioOnly ? 'best' : quality, isAudioOnly, shouldTranscribe });
  }

  const footer = (
    <Button type="button" size="lg" className="w-full" disabled={isBlocked} onClick={handleDownload}>
      {kind === 'audio' ? <><Music /> Download MP3</> : <><Download /> Download {QUALITY_LABELS[quality]}</>}
    </Button>
  );

  return (
    <DetailPanel title="Download" description={maxHeight ? `Up to ${maxHeight}p on YouTube` : undefined} footer={footer}>
      <Tabs value={kind} onValueChange={(value) => setKind(value === 'audio' ? 'audio' : 'video')}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="video">Video and audio</TabsTrigger>
          <TabsTrigger value="audio">Audio only</TabsTrigger>
        </TabsList>
        <TabsContent value="video" className="space-y-4 pt-3">
          <QualityOptions value={quality} maxHeight={maxHeight} isFfmpegInstalled={isFfmpegInstalled} onChange={setQuality} />
          {!isFfmpegInstalled && (
            <Notice tone="warning">Qualities above 720p need FFmpeg to merge video and audio. Restart kinetube to run setup again, or pick 720p or lower.</Notice>
          )}
        </TabsContent>
        <TabsContent value="audio" className="space-y-3 pt-3">
          <p className="text-[13px] leading-5 text-ink-muted">Downloads the best audio track and converts it to MP3.</p>
          {video.audioFormats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.audioFormats.map((format) => <StatusBadge key={format.formatId}>{format.label}</StatusBadge>)}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <TranscribeToggle id="video-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
    </DetailPanel>
  );
}
