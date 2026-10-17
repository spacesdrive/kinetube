import { Calendar, Clock, Eye, Play } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { formatCount, formatUploadDate } from '@/lib/format';

import type { YouTubeVideo } from '@shared/youtube.ts';

export interface VideoSummaryCardProps {
  video: YouTubeVideo;
}

export default function VideoSummaryCard({ video }: VideoSummaryCardProps) {
  const { title, thumbnailUrl, durationText, uploader, viewCount, uploadDate, description } = video;
  const views = formatCount(viewCount);
  const date = formatUploadDate(uploadDate);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="relative flex-shrink-0 md:w-72">
          {thumbnailUrl && <img src={thumbnailUrl} alt={title} className="h-48 w-full object-cover md:h-full" />}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play size={22} className="ml-1 text-blue-600" fill="currentColor" />
            </div>
          </div>
          {durationText && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">{durationText}</span>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h2 className="mb-2 line-clamp-2 text-lg font-bold leading-snug">{title}</h2>
            {uploader && <p className="mb-3 text-sm font-medium text-blue-600">{uploader}</p>}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {views && <span className="flex items-center gap-1"><Eye size={13} /> {views} views</span>}
              {date && <span className="flex items-center gap-1"><Calendar size={13} /> {date}</span>}
              {durationText && <span className="flex items-center gap-1"><Clock size={13} /> {durationText}</span>}
            </div>
            {description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
