import type { VideoEntry, VideoEntryStatus } from '@shared/youtube.ts';

export type CollectionFilter = 'all' | 'selected' | 'blocked';

export const STATUS_LABELS: Record<Exclude<VideoEntryStatus, 'available'>, string> = {
  upcoming: 'Upcoming',
  live: 'Live now',
  unavailable: 'Unavailable',
};

// an upcoming or running stream has no finished file yet, and private or deleted videos never will
export function isDownloadable(entry: VideoEntry): boolean {
  return entry.status === 'available';
}

export function filterEntries(entries: readonly VideoEntry[], query: string, filter: CollectionFilter, selectedIds: ReadonlySet<string>): VideoEntry[] {
  const words = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (words && !entry.title.toLowerCase().includes(words)) return false;
    if (filter === 'selected') return selectedIds.has(entry.id);
    if (filter === 'blocked') return !isDownloadable(entry);
    return true;
  });
}

// with nothing ticked, the bar offers everything the search and filter show that can be downloaded
export function downloadTargets(entries: readonly VideoEntry[], shown: readonly VideoEntry[], selectedIds: ReadonlySet<string>): VideoEntry[] {
  const selected = entries.filter((entry) => selectedIds.has(entry.id) && isDownloadable(entry));
  return selected.length > 0 ? selected : shown.filter(isDownloadable);
}

export function countBlocked(entries: readonly VideoEntry[]): number {
  return entries.filter((entry) => !isDownloadable(entry)).length;
}
