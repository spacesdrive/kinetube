import { openStream } from './eventStream';
import { API_BASE, jsonInit, request, requestNoContent } from './request';

import type { DataResponse, ListResponse } from '@shared/api.ts';
import type {
  CreateDownloadBatchRequest,
  CreateDownloadRequest,
  Download,
  DownloadBatchEvents,
  DownloadEvents,
  DownloadStatus,
} from '@shared/downloads.ts';
import type { Folder, PickedFolder } from '@shared/folders.ts';
import type {
  CreateInstagramAccountRequest,
  InstagramAccount,
  InstagramLoginResult,
  InstagramMedia,
  InstagramMediaEvents,
} from '@shared/instagram.ts';
import type { Tool, ToolId, ToolInstallEvents, YtdlpRelease } from '@shared/tools.ts';
import type {
  CreateTranscriptionRequest,
  ModelDownloadEvents,
  TranscriptionEvents,
  WhisperModel,
  WhisperModelId,
} from '@shared/transcriptions.ts';
import type { YouTubeMedia } from '@shared/youtube.ts';
import type { StreamHandler, StreamHandle } from './eventStream';

function query(params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// every backend endpoint, in the order of docs/architecture/backend/ROUTES.md
export const api = {
  listTools: (toolIds?: ToolId[]) => request<ListResponse<Tool>>(`/tools${query({ ids: toolIds?.join(',') })}`),
  getTool: (toolId: ToolId) => request<DataResponse<Tool>>(`/tools/${toolId}`),
  installTool: (toolId: ToolId, onEvent: StreamHandler<ToolInstallEvents>): StreamHandle =>
    openStream(`/tools/${toolId}/install`, { method: 'POST' }, onEvent),
  updateTool: (toolId: ToolId, onEvent: StreamHandler<ToolInstallEvents>): StreamHandle =>
    openStream(`/tools/${toolId}/update`, { method: 'POST' }, onEvent),
  getLatestYtdlpRelease: () => request<DataResponse<YtdlpRelease>>('/tools/ytdlp/releases/latest'),

  getYouTubeMedia: (url: string) => request<DataResponse<YouTubeMedia>>(`/youtube/media${query({ url })}`),
  getInstagramMedia: (url: string, account: string | null) =>
    request<DataResponse<InstagramMedia>>(`/instagram/media${query({ url, account })}`),
  streamInstagramMedia: (url: string, account: string | null, onEvent: StreamHandler<InstagramMediaEvents>): StreamHandle =>
    openStream(`/instagram/media${query({ url, account })}`, {}, onEvent),

  listDownloads: (status?: DownloadStatus) => request<ListResponse<Download>>(`/downloads${query({ status })}`),
  createDownload: (body: CreateDownloadRequest, onEvent: StreamHandler<DownloadEvents>): StreamHandle =>
    openStream('/downloads', jsonInit(body), onEvent),
  resumeDownload: (downloadId: string, onEvent: StreamHandler<DownloadEvents>): StreamHandle =>
    openStream(`/downloads/${downloadId}/resume`, { method: 'POST' }, onEvent),
  pauseDownload: (downloadId: string) => request<DataResponse<Download>>(`/downloads/${downloadId}/pause`, { method: 'POST' }),
  removeDownload: (downloadId: string) => requestNoContent(`/downloads/${downloadId}`, { method: 'DELETE' }),
  createDownloadBatch: (body: CreateDownloadBatchRequest, onEvent: StreamHandler<DownloadBatchEvents>): StreamHandle =>
    openStream('/download-batches', jsonInit(body), onEvent),

  listWhisperModels: () => request<ListResponse<WhisperModel>>('/whisper-models'),
  downloadWhisperModel: (modelId: WhisperModelId, onEvent: StreamHandler<ModelDownloadEvents>): StreamHandle =>
    openStream(`/whisper-models/${modelId}/download`, { method: 'POST' }, onEvent),
  transcribeFile: (body: CreateTranscriptionRequest, onEvent: StreamHandler<TranscriptionEvents>): StreamHandle =>
    openStream('/transcriptions', jsonInit(body), onEvent),
  transcribeUpload(file: File, modelId: WhisperModelId, language: string, onEvent: StreamHandler<TranscriptionEvents>): StreamHandle {
    const form = new FormData();
    form.append('file', file);
    form.append('modelId', modelId);
    form.append('language', language);
    return openStream('/transcriptions', { method: 'POST', body: form }, onEvent);
  },

  listInstagramAccounts: () => request<ListResponse<InstagramAccount>>('/instagram/accounts'),
  createInstagramAccount: (body: CreateInstagramAccountRequest) =>
    request<DataResponse<InstagramLoginResult>>('/instagram/accounts', jsonInit(body)),
  verifyInstagramLogin: (username: string, code: string) =>
    request<DataResponse<InstagramAccount>>(`/instagram/accounts/${encodeURIComponent(username)}/two-factor`, jsonInit({ code })),
  removeInstagramAccount: (username: string) =>
    requestNoContent(`/instagram/accounts/${encodeURIComponent(username)}`, { method: 'DELETE' }),

  getFolder: (folderPath: string) => request<DataResponse<Folder>>(`/folders/${encodeURIComponent(folderPath)}`),
  pickFolder: () => request<DataResponse<PickedFolder>>('/folders/pick', { method: 'POST' }),

  // Instagram and YouTube refuse hotlinked images, so <img> tags load them through the backend
  imageUrl: (url: string | null): string | null => (url ? `${API_BASE}/images${query({ url })}` : null),
};
