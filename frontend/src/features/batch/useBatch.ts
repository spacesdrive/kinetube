import { useCallback, useState } from 'react';

import { cleanInstagramUrl, cleanYouTubeUrl, isInstagramLink } from '@/lib/urlCleaners';
import { api } from '@/services/api';
import { initialSelection, parseBatchUrls } from './batchResults';

import type { BatchResult, FoundMedia } from './batchResults';

async function lookUp(url: string, account: string | null): Promise<FoundMedia> {
  if (isInstagramLink(url)) {
    const { data } = await api.getInstagramMedia(cleanInstagramUrl(url), account);
    return { platform: 'instagram', media: data };
  }
  const { data } = await api.getYouTubeMedia(cleanYouTubeUrl(url));
  return { platform: 'youtube', media: data };
}

// reads each pasted link one after another, so Instagram is never hit with a burst of lookups
export function useBatch(account: string | null) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateResult = useCallback((index: number, result: BatchResult) => {
    setResults((previous) => previous.map((existing, existingIndex) => (existingIndex === index ? result : existing)));
  }, []);

  const process = useCallback(async () => {
    const urls = parseBatchUrls(text);
    if (urls.length === 0) return;

    setIsProcessing(true);
    setResults(urls.map((url) => ({ url, status: 'pending' })));
    for (const [index, url] of urls.entries()) {
      updateResult(index, { url, status: 'loading' });
      try {
        const found = await lookUp(url, account);
        updateResult(index, { url, status: 'ready', found, selectedIds: initialSelection(found) });
      } catch (error) {
        updateResult(index, { url, status: 'error', message: (error as Error).message });
      }
    }
    setIsProcessing(false);
  }, [text, account, updateResult]);

  const setSelection = useCallback((index: number, selectedIds: ReadonlySet<string>) => {
    setResults((previous) => previous.map((result, resultIndex) => (resultIndex === index && result.status === 'ready' ? { ...result, selectedIds } : result)));
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setText('');
  }, []);

  return { text, setText, results, isProcessing, process, setSelection, reset };
}

export type BatchState = ReturnType<typeof useBatch>;
