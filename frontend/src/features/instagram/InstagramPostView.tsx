import { Clock, Download, Eye, Heart, Mic, Play, User } from 'lucide-react';
import { useState } from 'react';

import QualitySelect from '@/components/QualitySelect';
import TranscribeToggle from '@/components/TranscribeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCount, formatDuration } from '@/lib/format';
import { SHORT_QUALITY_LIST } from '@/lib/qualities';
import { api } from '@/services/api';

import type { VideoQuality } from '@shared/downloads.ts';
import type { InstagramPost } from '@shared/instagram.ts';
import type { MediaDownloadRequest } from '../downloads/downloadRequests';

export interface InstagramPostViewProps {
  post: InstagramPost;
  defaultQuality: VideoQuality;
  onDownload(request: MediaDownloadRequest): void;
}

const TYPE_LABELS: Record<InstagramPost['urlType'], string> = { post: 'Post', reel: 'Reel', story: 'Story' };

// the preview keeps the post's shape but never grows taller than it is wide
function previewPadding({ width, height, urlType }: InstagramPost): string {
  let aspect = urlType === 'reel' ? 16 / 9 : 1;
  if (width && height) aspect = height / width;
  return `${(Math.min(aspect, 1) * 100).toFixed(2)}%`;
}

export default function InstagramPostView({ post, defaultQuality, onDownload }: InstagramPostViewProps) {
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const [shouldTranscribe, setShouldTranscribe] = useState(false);
  const [hasThumbnailError, setHasThumbnailError] = useState(false);
  const thumbnail = hasThumbnailError ? null : api.imageUrl(post.thumbnailUrl);
  const views = formatCount(post.viewCount);
  const likes = formatCount(post.likeCount);
  const duration = formatDuration(post.duration);

  return (
    <Card className="mx-auto mt-6 w-full max-w-2xl animate-fade-slide-up overflow-hidden">
      <div className="relative w-full overflow-hidden bg-muted" style={{ paddingBottom: previewPadding(post) }}>
        {thumbnail ? (
          <img src={thumbnail} alt={post.title} onError={() => setHasThumbnailError(true)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Play size={48} className="text-muted-foreground/20" /></div>
        )}
        <Badge className="absolute left-3 top-3 border-0 bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm">{TYPE_LABELS[post.urlType]}</Badge>
        {duration && <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-xs font-semibold text-white">{duration}</span>}
      </div>

      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="line-clamp-2 text-base font-semibold leading-snug">{post.title}</h2>
          {post.uploader && <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><User size={12} /><span>@{post.uploader}</span></div>}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {views && <span className="flex items-center gap-1"><Eye size={13} />{views}</span>}
          {likes && <span className="flex items-center gap-1"><Heart size={13} />{likes}</span>}
          {duration && <span className="flex items-center gap-1"><Clock size={13} />{duration}</span>}
        </div>
        <QualitySelect value={quality} options={SHORT_QUALITY_LIST} onChange={setQuality} className="w-40" />
        <TranscribeToggle id="post-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
        <Button
          type="button"
          className="w-full border-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm hover:from-purple-700 hover:to-pink-700"
          onClick={() => onDownload({ url: post.url, title: post.title, quality, isAudioOnly: false, shouldTranscribe })}
        >
          {shouldTranscribe ? <Mic size={15} className="mr-2" /> : <Download size={15} className="mr-2" />}
          {shouldTranscribe ? 'Download and transcribe' : 'Download'}
        </Button>
      </CardContent>
    </Card>
  );
}
