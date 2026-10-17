import { User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { pluralize } from '@/lib/format';
import { api } from '@/services/api';

import type { InstagramProfile } from '@shared/instagram.ts';

export interface ProfileHeaderProps {
  profile: InstagramProfile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const avatarSrc = api.imageUrl(profile.avatarUrl);

  return (
    <div className="mb-6 flex items-center gap-4 px-1">
      <Avatar className="h-14 w-14 ring-2 ring-pink-200 dark:ring-pink-900">
        {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name} />}
        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white"><User size={24} /></AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-xl font-bold">@{profile.username}</h2>
        <p className="text-sm text-muted-foreground">
          {pluralize(profile.postCount, 'post')}
          {profile.isTruncated && (
            <Badge variant="outline" className="ml-2 border-amber-200 text-amber-600 dark:border-amber-800">Showing the first 500</Badge>
          )}
        </p>
      </div>
    </div>
  );
}
