import { useCallback, useEffect, useState } from 'react';

import { loadSettings } from '@/lib/settings';
import { api } from '@/services/api';

import type { WhisperModel, WhisperModelId } from '@shared/transcriptions.ts';

export function useWhisperModels(isWhisperInstalled: boolean) {
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<WhisperModelId>(() => loadSettings().transcription.defaultModel);
  const [downloadingModelId, setDownloadingModelId] = useState<WhisperModelId | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api
      .listWhisperModels()
      .then(({ data }) => setModels(data))
      .catch((failure: unknown) => setError(`Couldn't load the models. ${(failure as Error).message}`));
  }, []);

  useEffect(() => {
    if (isWhisperInstalled) refresh();
  }, [isWhisperInstalled, refresh]);

  const download = useCallback((modelId: WhisperModelId) => {
    setDownloadingModelId(modelId);
    setPercent(0);
    setError('');
    api.downloadWhisperModel(modelId, (...[event, data]) => {
      if (event === 'progress') setPercent(data.percent);
      if (event !== 'done') return;
      setDownloadingModelId(null);
      if (!data.success) {
        setError(data.message);
        return;
      }
      setSelectedModelId(modelId);
      refresh();
    });
  }, [refresh]);

  const isSelectedReady = models.some((model) => model.id === selectedModelId && model.isDownloaded);

  return { models, selectedModelId, setSelectedModelId, downloadingModelId, percent, error, isSelectedReady, refresh, download };
}

export type WhisperModels = ReturnType<typeof useWhisperModels>;
