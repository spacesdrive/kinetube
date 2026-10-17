import { useCallback, useState } from 'react';

import { loadSettings } from '@/lib/settings';
import { api } from '@/services/api';

export type TranscriptOutcome =
  | { kind: 'text'; text: string; outputPath: string }
  | { kind: 'error'; message: string };

export type PostDownloadTranscription = ReturnType<typeof usePostDownloadTranscription>;

function transcriptionRequest(filePath: string) {
  const { defaultModel, defaultLanguage } = loadSettings().transcription;
  return { filePath, modelId: defaultModel, language: defaultLanguage };
}

// transcribes a file that was just downloaded, with the model and language chosen in Settings
export function usePostDownloadTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [outcome, setOutcome] = useState<TranscriptOutcome | null>(null);

  const transcribe = useCallback((filePath: string) => {
    setIsTranscribing(true);
    setOutcome(null);
    api.transcribeFile(transcriptionRequest(filePath), (...[event, data]) => {
      if (event !== 'done') return;
      setIsTranscribing(false);
      if (data.success) setOutcome({ kind: 'text', text: data.text, outputPath: data.outputPath });
      else setOutcome({ kind: 'error', message: `Couldn't transcribe the file. ${data.message}` });
    });
  }, []);

  // a bulk download transcribes each file in the background and only saves the .txt beside it
  const transcribeQuietly = useCallback((filePath: string) => {
    api.transcribeFile(transcriptionRequest(filePath), () => {});
  }, []);

  const reset = useCallback(() => {
    setIsTranscribing(false);
    setOutcome(null);
  }, []);

  return { isTranscribing, outcome, transcribe, transcribeQuietly, reset };
}
