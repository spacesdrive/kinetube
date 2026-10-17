import { Download, Music, Play } from 'lucide-react';
import { useState } from 'react';

import TranscribeToggle from '@/components/TranscribeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QUALITY_LABELS, qualityNeedsFfmpeg } from '@/lib/qualities';
import FfmpegNotice from './FfmpegNotice';
import QualityGrid from './QualityGrid';

import type { VideoQuality } from '@shared/downloads.ts';
import type { YouTubeVideo } from '@shared/youtube.ts';
import type { MediaDownloadRequest } from '../downloads/downloadRequests';

export interface VideoDownloadTabsProps {
  video: YouTubeVideo;
  defaultQuality: VideoQuality;
  isFfmpegInstalled: boolean;
  onDownload(request: MediaDownloadRequest): void;
}

const TAB_CLASS = 'flex flex-1 items-center justify-center gap-2 rounded-none py-4 data-active:border-b-2 data-active:shadow-none';

export default function VideoDownloadTabs({ video, defaultQuality, isFfmpegInstalled, onDownload }: VideoDownloadTabsProps) {
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const [shouldTranscribe, setShouldTranscribe] = useState(false);
  const needsFfmpeg = qualityNeedsFfmpeg(quality);
  const request = { url: video.url, title: video.title, shouldTranscribe };

  return (
    <Card>
      <Tabs defaultValue="video">
        <CardHeader className="p-0">
          <TabsList className="h-auto w-full rounded-none rounded-t-xl border-b bg-transparent p-0">
            <TabsTrigger value="video" className={`${TAB_CLASS} data-active:border-blue-600 data-active:text-blue-600`}><Play size={16} /> Video and audio</TabsTrigger>
            <TabsTrigger value="audio" className={`${TAB_CLASS} data-active:border-purple-600 data-active:text-purple-600`}><Music size={16} /> Audio only (MP3)</TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="p-6">
          <TabsContent value="video" className="mt-0 space-y-4">
            <div>
              <Label className="mb-2 block font-semibold">Quality</Label>
              <QualityGrid value={quality} isFfmpegInstalled={isFfmpegInstalled} onChange={setQuality} />
              {needsFfmpeg && <FfmpegNotice isFfmpegInstalled={isFfmpegInstalled} />}
            </div>
            <Button
              type="button"
              onClick={() => onDownload({ ...request, quality, isAudioOnly: false })}
              disabled={needsFfmpeg && !isFfmpegInstalled}
              className="h-12 w-full text-base shadow-md"
            >
              <Download className="mr-2 h-4 w-4" />
              Download video ({QUALITY_LABELS[quality]})
            </Button>
            <TranscribeToggle id="video-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
          </TabsContent>

          <TabsContent value="audio" className="mt-0 space-y-4">
            <div className="rounded-xl bg-purple-50 p-4 text-sm font-medium text-purple-700">Downloads the best audio track and converts it to MP3.</div>
            {video.audioFormats.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Audio streams on YouTube</p>
                <div className="flex flex-wrap gap-2">
                  {video.audioFormats.map((format) => (
                    <Badge key={format.formatId} variant="secondary" className="bg-purple-100 text-purple-700">{format.label}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Button type="button" onClick={() => onDownload({ ...request, quality: 'best', isAudioOnly: true })} className="h-12 w-full bg-purple-600 text-base shadow-md hover:bg-purple-700">
              <Music className="mr-2 h-4 w-4" />
              Download audio (MP3)
            </Button>
            <TranscribeToggle id="audio-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
