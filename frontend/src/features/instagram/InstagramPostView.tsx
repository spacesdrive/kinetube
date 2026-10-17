import { Download, Mic } from 'lucide-react';
import { useState } from 'react';

import DetailPanel from '@/components/patterns/DetailPanel';
import MediaThumbnail from '@/components/patterns/MediaThumbnail';
import StatusBadge from '@/components/patterns/StatusBadge';
import SurfaceBox from '@/components/patterns/SurfaceBox';
import QualitySelect from '@/components/QualitySelect';
import TranscribeToggle from '@/components/TranscribeToggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCount, formatDuration, formatViews } from '@/lib/format';
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

// a reel is tall and a post is square; the preview keeps the shape but never grows taller than it is wide
function aspectClass({ width, height, urlType }: InstagramPost): string {
  const isTall = width && height ? height > width : urlType !== 'post';
  return isTall ? 'aspect-[4/5]' : 'aspect-square';
}

export default function InstagramPostView({ post, defaultQuality, onDownload }: InstagramPostViewProps) {
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const [shouldTranscribe, setShouldTranscribe] = useState(false);
  const likes = formatCount(post.likeCount);
  const facts = [post.uploader ? `@${post.uploader}` : null, formatViews(post.viewCount), likes ? `${likes} likes` : null].filter(Boolean);

  const footer = (
    <Button type="button" size="lg" className="w-full" onClick={() => onDownload({ url: post.url, title: post.title, quality, isAudioOnly: false, shouldTranscribe })}>
      {shouldTranscribe ? <><Mic /> Download and transcribe</> : <><Download /> Download</>}
    </Button>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--panel-width)]">
      <SurfaceBox padding="none" className="overflow-hidden">
        <div className="mx-auto max-w-md p-4">
          <MediaThumbnail src={api.imageUrl(post.thumbnailUrl)} alt={post.title} duration={formatDuration(post.duration)} badge={<StatusBadge tone="accent">{TYPE_LABELS[post.urlType]}</StatusBadge>} className={`w-full rounded-control ${aspectClass(post)}`} />
        </div>
        <div className="space-y-1.5 border-t border-divider p-5">
          <h2 className="line-clamp-3 text-[15px] leading-6 font-semibold text-ink">{post.title}</h2>
          {facts.length > 0 && <p className="text-[13px] text-ink-muted">{facts.join('  ·  ')}</p>}
        </div>
      </SurfaceBox>
      <DetailPanel title="Download" description="Instagram serves one combined file per height." footer={footer}>
        <div className="space-y-2">
          <Label className="text-[13px] text-ink-muted">Quality</Label>
          <QualitySelect value={quality} options={SHORT_QUALITY_LIST} onChange={setQuality} className="w-full" />
        </div>
        <TranscribeToggle id="post-transcribe" isOn={shouldTranscribe} onChange={setShouldTranscribe} />
      </DetailPanel>
    </div>
  );
}
