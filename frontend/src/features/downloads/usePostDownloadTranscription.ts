import { useCallback, useState } from 'react';

import { loadSettings } from '@/lib/settings';
import { api } from '@/services/api';

import type { CreateTranscriptionRequest, TranscriptFiles } from '@shared/transcriptions.ts';

export type TranscriptOutcome =
  | { kind: 'text'; text: string; transcripts: TranscriptFiles; outputPaths: string[] }
  | { kind: 'error'; message: string };

export type PostDownloadTranscription = ReturnType<typeof usePostDownloadTranscription>;

function transcriptionRequest(filePath: string): CreateTranscriptionRequest {
  const { defaultModel, defaultLanguage, fileFormats } = loadSettings().transcription;
  return { filePath, modelId: defaultModel, language: defaultLanguage, formats: fileFormats };
}

// transcribes a file that was just downloaded, with the model, language and files chosen in Settings
export function usePostDownloadTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [outcome, setOutcome] = useState<TranscriptOutcome | null>(null);

  const transcribe = useCallback((filePath: string) => {
    setIsTranscribing(true);
    setOutcome(null);
    api.transcribeFile(transcriptionRequest(filePath), (...[event, data]) => {
      if (event !== 'done') return;
      setIsTranscribing(false);
      if (data.success) setOutcome({ kind: 'text', text: data.text, transcripts: data.transcripts, outputPaths: data.outputPaths });
      else setOutcome({ kind: 'error', message: `Couldn't transcribe the file. ${data.message}` });
    });
  }, []);

  // a bulk download transcribes each file in the background and only saves the files beside it
  const transcribeQuietly = useCallback((filePath: string) => {
    api.transcribeFile(transcriptionRequest(filePath), () => {});
  }, []);

  const reset = useCallback(() => {
    setIsTranscribing(false);
    setOutcome(null);
  }, []);

  return { isTranscribing, outcome, transcribe, transcribeQuietly, reset };
}
