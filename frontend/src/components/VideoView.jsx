import { useState } from 'react';
import { Play, Music, Download, Eye, Calendar, Clock, AlertCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const VIDEO_QUALITIES = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
const QUALITY_LABELS = {
  best: 'Best Available',
  '2160p': '4K (2160p)',
  '1440p': '2K (1440p)',
  '1080p': '1080p Full HD',
  '720p': '720p HD',
  '480p': '480p SD',
  '360p': '360p',
};
const NEEDS_FFMPEG = ['best', '2160p', '1440p', '1080p'];

function formatNumber(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(uploadDate) {
  if (!uploadDate) return '—';
  const s = uploadDate.toString();
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

export default function VideoView({ info, ffmpegAvailable, onDownload }) {
  const [tab, setTab]           = useState('video');
  const [videoQuality, setVideoQuality] = useState('best');
  const [transcribe, setTranscribe]     = useState(false);

  const handleVideoDownload = () =>
    onDownload({ url: info.cleanUrl, quality: videoQuality, audioOnly: false, title: info.title, transcribe });

  const handleAudioDownload = () =>
    onDownload({ url: info.cleanUrl, quality: 'best', audioOnly: true, title: info.title, transcribe });

  const needsFFmpeg = NEEDS_FFMPEG.includes(videoQuality);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Video preview card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail */}
          <div className="relative md:w-72 flex-shrink-0">
            <img
              src={info.thumbnail}
              alt={info.title}
              className="w-full h-48 md:h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play size={22} className="text-blue-600 ml-1" fill="currentColor" />
              </div>
            </div>
            {info.durationString && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded-md">
                {info.durationString}
              </span>
            )}
          </div>

          {/* Metadata */}
          <CardContent className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold leading-snug line-clamp-2 mb-2">{info.title}</h2>
              {info.uploader && (
                <p className="text-sm text-blue-600 font-medium mb-3">{info.uploader}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {info.viewCount && (
                  <span className="flex items-center gap-1">
                    <Eye size={13} /> {formatNumber(info.viewCount)} views
                  </span>
                )}
                {info.uploadDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {formatDate(info.uploadDate)}
                  </span>
                )}
                {info.durationString && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {info.durationString}
                  </span>
                )}
              </div>
              {info.description && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{info.description}</p>
              )}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Download options */}
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <CardHeader className="p-0">
            <TabsList className="w-full rounded-none rounded-t-xl border-b h-auto p-0 bg-transparent">
              <TabsTrigger
                value="video"
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50/50 data-[state=active]:shadow-none"
              >
                <Play size={16} />
                Video + Audio
              </TabsTrigger>
              <TabsTrigger
                value="audio"
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50/50 data-[state=active]:shadow-none"
              >
                <Music size={16} />
                Audio Only (MP3)
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="video" className="mt-0 space-y-4">
              <div>
                <Label className="mb-2 block font-semibold">Select Quality</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIDEO_QUALITIES.map((q) => {
                    const needsMerge  = NEEDS_FFMPEG.includes(q);
                    const unavailable = needsMerge && !ffmpegAvailable;
                    return (
                      <button
                        key={q}
                        onClick={() => !unavailable && setVideoQuality(q)}
                        disabled={unavailable}
                        className={cn(
                          'relative px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-center',
                          videoQuality === q
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : unavailable
                            ? 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                            : 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50/50'
                        )}
                      >
                        {QUALITY_LABELS[q]}
                        {needsMerge && (
                          <span className="block text-xs mt-0.5 font-normal opacity-70">
                            {unavailable ? 'Needs FFmpeg' : 'FFmpeg req.'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {needsFFmpeg && !ffmpegAvailable && (
                  <Alert variant="default" className="mt-3 border-amber-200 bg-amber-50 py-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs text-amber-700">
                      FFmpeg is required to merge video+audio for qualities above 720p. Install FFmpeg and
                      restart the server, or choose 720p or below.
                    </AlertDescription>
                  </Alert>
                )}

                {needsFFmpeg && ffmpegAvailable && (
                  <Alert variant="default" className="mt-3 border-green-200 bg-green-50 py-2.5">
                    <Zap className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-xs text-green-700">
                      FFmpeg detected — video and audio will be merged automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                onClick={handleVideoDownload}
                disabled={needsFFmpeg && !ffmpegAvailable}
                className="w-full h-12 text-base shadow-md"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Video — {QUALITY_LABELS[videoQuality]}
              </Button>

              <div className="flex items-center justify-between pt-1 border-t">
                <div>
                  <p className="text-sm font-medium">Transcribe after download</p>
                  <p className="text-xs text-muted-foreground">Generate a text transcript using Whisper AI</p>
                </div>
                <Switch checked={transcribe} onCheckedChange={setTranscribe} />
              </div>
            </TabsContent>

            <TabsContent value="audio" className="mt-0 space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700 font-medium">
                Downloads the best available audio track and converts it to MP3.
              </div>

              {info.audioFormats?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Available audio streams</p>
                  <div className="flex flex-wrap gap-2">
                    {info.audioFormats.map((af) => (
                      <Badge key={af.formatId} variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                        {af.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAudioDownload}
                className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700 shadow-md"
              >
                <Music className="mr-2 h-4 w-4" />
                Download Audio (MP3)
              </Button>

              <div className="flex items-center justify-between pt-1 border-t">
                <div>
                  <p className="text-sm font-medium">Transcribe after download</p>
                  <p className="text-xs text-muted-foreground">Generate a text transcript using Whisper AI</p>
                </div>
                <Switch checked={transcribe} onCheckedChange={setTranscribe} />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
