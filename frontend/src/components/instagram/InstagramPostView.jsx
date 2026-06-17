import { useState } from 'react';
import { Download, Heart, Eye, Clock, User, Play, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

function fmtNum(n) {
  if (n == null || n < 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function proxyUrl(url) {
  if (!url) return null;
  return `/api/proxy/img?url=${encodeURIComponent(url)}`;
}

const QUALITIES = [
  { label: 'Best', value: 'best' },
  { label: '1080p', value: '1080p' },
  { label: '720p',  value: '720p'  },
  { label: '480p',  value: '480p'  },
];

export default function InstagramPostView({ info, account, onDownload }) {
  const [quality, setQuality]       = useState('best');
  const [thumbError, setThumbError] = useState(false);
  const [transcribe, setTranscribe] = useState(false);

  const isReel   = info.type === 'reel';
  const typeLabel = isReel ? 'Reel' : info.type === 'story' ? 'Story' : 'Post';

  const views    = fmtNum(info.viewCount);
  const likes    = fmtNum(info.likeCount);
  const duration = info.duration ? fmtDuration(info.duration) : null;

  let thumbAspect;
  if (info.width && info.height && info.width > 0) {
    thumbAspect = info.height / info.width;
  } else {
    thumbAspect = isReel ? 16 / 9 : 1;
  }
  const cappedAspect = Math.min(thumbAspect, 1.0);
  const paddingPct   = (cappedAspect * 100).toFixed(2);

  const thumb = !thumbError && info.thumbnail ? proxyUrl(info.thumbnail) : null;

  return (
    <Card className="w-full max-w-2xl mx-auto mt-6 overflow-hidden animate-fade-slide-up" style={{ animationFillMode: 'both' }}>
      {/* Thumbnail */}
      <div className="relative bg-muted w-full overflow-hidden" style={{ paddingBottom: `${paddingPct}%` }}>
        {thumb ? (
          <img
            src={thumb}
            alt={info.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play size={48} className="text-muted-foreground/20" />
          </div>
        )}

        {/* Type badge */}
        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white border-0 shadow-sm">
          {isReel ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
              <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            </svg>
          )}
          {typeLabel}
        </Badge>

        {duration && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-black/60 text-white">
            {duration}
          </span>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold leading-snug line-clamp-2">{info.title || 'Untitled'}</h2>
          {info.uploader && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <User size={12} />
              <span>@{info.uploader}</span>
            </div>
          )}
        </div>

        {(views || likes || duration) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {views    && <span className="flex items-center gap-1"><Eye   size={13} />{views}</span>}
            {likes    && <span className="flex items-center gap-1"><Heart size={13} />{likes}</span>}
            {duration && <span className="flex items-center gap-1"><Clock size={13} />{duration}</span>}
          </div>
        )}

        {/* Quality selector */}
        <ToggleGroup
          type="single"
          value={quality}
          onValueChange={(v) => v && setQuality(v)}
          className="flex flex-wrap justify-start gap-1.5"
        >
          {QUALITIES.map((q) => (
            <ToggleGroupItem
              key={q.value}
              value={q.value}
              size="sm"
              className={cn(
                'rounded-lg text-xs font-semibold px-3 h-8',
                quality === q.value && 'bg-gradient-to-r from-purple-600 to-pink-600 text-white data-[state=on]:bg-none'
              )}
            >
              {q.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator />

        {/* Transcribe toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="post-transcribe" className="text-sm font-medium">Transcribe after download</Label>
            <p className="text-xs text-muted-foreground">Generate a text transcript using Whisper AI</p>
          </div>
          <Switch
            id="post-transcribe"
            checked={transcribe}
            onCheckedChange={setTranscribe}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>

        {/* Download button */}
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-sm"
          onClick={() => onDownload({ url: info.cleanUrl, quality, title: info.title, account, transcribe })}
        >
          {transcribe ? <Mic size={15} className="mr-2" /> : <Download size={15} className="mr-2" />}
          {transcribe ? 'Download + Transcript' : 'Download'}
        </Button>
      </CardContent>
    </Card>
  );
}
