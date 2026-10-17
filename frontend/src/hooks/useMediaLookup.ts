import { useCallback, useRef, useState } from 'react';

import { api } from '@/services/api';

import type { InstagramMedia } from '@shared/instagram.ts';
import type { FoundMedia } from '@/features/batch/batchResults';
import type { DownloadPlatformPage } from '@/lib/pages';

export interface ProfileProgress {
  name: string;
  fetchedCount: number;
  totalCount: number;
}

// reading an Instagram profile can take minutes, so it streams the header and a count while it works
function streamInstagram(url: string, account: string | null, onProgress: (progress: ProfileProgress) => void): Promise<InstagramMedia> {
  let name = '';
  return new Promise((resolve, reject) => {
    api.streamInstagramMedia(url, account, (...[event, data]) => {
      if (event === 'profile') {
        name = data.name;
        onProgress({ name, fetchedCount: 0, totalCount: data.postCount });
      } else if (event === 'progress') {
        onProgress({ name, fetchedCount: data.fetchedCount, totalCount: data.totalCount });
      } else if (event === 'done') {
        if (data.success) resolve(data.media);
        else reject(new Error(data.message));
      }
    });
  });
}

export function useMediaLookup() {
  const [found, setFound] = useState<FoundMedia | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProfileProgress | null>(null);
  // a newer lookup wins; the answer to an older one is dropped. The last result stays on screen while the next loads
  const generationRef = useRef(0);

  const lookUp = useCallback(async (platform: DownloadPlatformPage, url: string, account: string | null): Promise<FoundMedia | null> => {
    const generation = ++generationRef.current;
    setIsLoading(true);
    setError('');
    setProgress(null);
    try {
      const result: FoundMedia = platform === 'instagram'
        ? { platform, media: await streamInstagram(url, account, setProgress) }
        : { platform, media: (await api.getYouTubeMedia(url)).data };
      if (generation !== generationRef.current) return null;
      setFound(result);
      return result;
    } catch (failure) {
      if (generation === generationRef.current) setError((failure as Error).message);
      return null;
    } finally {
      if (generation === generationRef.current) {
        setIsLoading(false);
        setProgress(null);
      }
    }
  }, []);

  const clear = useCallback(() => {
    generationRef.current++;
    setFound(null);
    setError('');
    setIsLoading(false);
  }, []);

  return { found, isLoading, error, progress, lookUp, clear, setError };
}

export type MediaLookup = ReturnType<typeof useMediaLookup>;
