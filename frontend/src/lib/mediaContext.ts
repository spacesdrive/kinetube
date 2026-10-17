import type { FoundMedia } from '@/features/batch/batchResults';

const POST_LABELS = { post: 'Post', reel: 'Reel', story: 'Story' } as const;

// the second part of the top bar's breadcrumb: what the page is showing right now
export function mediaContext({ media }: FoundMedia): string {
  if (media.kind === 'video') return media.urlType === 'shorts' ? 'Shorts' : 'Video';
  if (media.kind === 'channel') return media.name;
  if (media.kind === 'playlist') return media.title;
  if (media.kind === 'post') return POST_LABELS[media.urlType];
  return `@${media.username}`;
}
