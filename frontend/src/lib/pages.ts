export type Page = 'youtube' | 'instagram' | 'batch' | 'transcribe' | 'settings';

export type DownloadPlatformPage = Extract<Page, 'youtube' | 'instagram'>;

export const PAGE_LABELS: Record<Page, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  batch: 'Batch download',
  transcribe: 'Transcribe',
  settings: 'Settings',
};

export function isDownloadPage(page: Page): page is DownloadPlatformPage {
  return page === 'youtube' || page === 'instagram';
}
