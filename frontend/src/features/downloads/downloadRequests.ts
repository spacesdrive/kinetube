import type { BulkDownloadRequest, SingleDownloadRequest } from './useActiveDownload';

// what a media view asks for; the page adds the Instagram account the person chose in the sidebar
export type MediaDownloadRequest = Omit<SingleDownloadRequest, 'account'>;
export type MediaBulkRequest = Omit<BulkDownloadRequest, 'account'>;

export interface MediaDownloadHandlers {
  onDownload(request: MediaDownloadRequest): void;
  onBulkDownload(request: MediaBulkRequest): void;
}
