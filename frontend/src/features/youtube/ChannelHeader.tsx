import { Play, Video, Zap } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { pluralize } from '@/lib/format';
import { api } from '@/services/api';

import type { YouTubeChannel } from '@shared/youtube.ts';

export interface ChannelHeaderProps {
  channel: YouTubeChannel;
}

export default function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const isShorts = channel.urlType === 'channel-shorts';
  const avatarSrc = hasAvatarError ? null : api.imageUrl(channel.avatarUrl);

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {avatarSrc && (
          <img src={avatarSrc} alt={channel.name} onError={() => setHasAvatarError(true)} className="h-14 w-14 flex-shrink-0 rounded-full bg-muted object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{channel.name}</h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {isShorts ? (
              <span className="flex items-center gap-1"><Zap size={14} className="text-amber-500" /> Shorts</span>
            ) : (
              <span className="flex items-center gap-1"><Video size={14} /> Videos</span>
            )}
            <span className="flex items-center gap-1"><Play size={14} /> {pluralize(channel.videoCount, isShorts ? 'short' : 'video')} found</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
