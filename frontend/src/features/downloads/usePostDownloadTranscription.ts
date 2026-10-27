import { useCallback, useRef, useState } from 'react';

import { loadSettings, toTranscriptionOptions } from '@/lib/settings';
import { api } from '@/services/api';

import type { TranscriptFiles } from '@shared/transcriptions.ts';
import type { StreamHandle } from '@/services/eventStream';

export type TranscriptOutcome =
  | { kind: 'text'; text: string; transcripts: TranscriptFiles; outputPaths: string[] }
  | { kind: 'error'; message: string };

export type PostDownloadTranscription = ReturnType<typeof usePostDownloadTranscription>;

// transcribes a file that was just downloaded, with the model, language and files chosen in Settings
export function usePostDownloadTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [percent, setPercent] = useState(0);
  const [outcome, setOutcome] = useState<TranscriptOutcome | null>(null);
  const streamRef = useRef<StreamHandle | null>(null);

  // closing the stream stops whisper.cpp on the backend
  const stop = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setIsTranscribing(false);
    setPercent(0);
  }, []);

  const transcribe = useCallback((filePath: string) => {
    streamRef.current?.close();
    setIsTranscribing(true);
    setPercent(0);
    setOutcome(null);
    const request = { filePath, ...toTranscriptionOptions(loadSettings().transcription) };
    streamRef.current = api.transcribeFile(request, (...[event, data]) => {
      if (event === 'progress') setPercent(data.percent);
      if (event !== 'done') return;
      streamRef.current = null;
      setIsTranscribing(false);
      if (data.success) setOutcome({ kind: 'text', text: data.text, transcripts: data.transcripts, outputPaths: data.outputPaths });
      else setOutcome({ kind: 'error', message: `Couldn't transcribe the file. ${data.message}` });
    });
  }, []);

  const reset = useCallback(() => {
    stop();
    setOutcome(null);
  }, [stop]);

  return { isTranscribing, percent, outcome, transcribe, stop, reset };
}
