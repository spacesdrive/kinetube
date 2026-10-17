// 1_234_567 -> "1.2M", 4_500 -> "4.5K"; null for a missing or zero count
export function formatCount(count: number | null | undefined): string | null {
  if (!count || count < 0) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

// yt-dlp's "20240315" -> "2024-03-15"
export function formatUploadDate(uploadDate: string | null | undefined): string | null {
  if (!uploadDate) return null;
  if (uploadDate.length !== 8) return uploadDate;
  return `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`;
}

const pad = (value: number): string => String(value).padStart(2, '0');

// 19 -> "0:19", 125 -> "2:05", 3725 -> "1:02:05"
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 0) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(remainder)}` : `${minutes}:${pad(remainder)}`;
}

// "444.7M views"; null when the count is missing
export function formatViews(count: number | null | undefined): string | null {
  const shortCount = formatCount(count);
  return shortCount ? `${shortCount} views` : null;
}

const MEGABYTE = 1024 * 1024;

// 1_572_864 -> "1.5 MB"; empty for zero
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < MEGABYTE) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '';
  if (bytesPerSecond < MEGABYTE) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSecond / MEGABYTE).toFixed(1)} MB/s`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
