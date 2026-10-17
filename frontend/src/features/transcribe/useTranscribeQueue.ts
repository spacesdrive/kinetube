import { useCallback, useRef, useState } from 'react';

import { saveTextFile, transcriptFileName } from '@/lib/saveTextFile';
import { loadSettings } from '@/lib/settings';
import { api } from '@/services/api';
import { applyTranscriptionEvent, isWaiting, itemFromFile, itemFromPath } from './transcribeQueueState';

import type { TranscriptFormat, TranscriptionEvents, WhisperModelId } from '@shared/transcriptions.ts';
import type { StreamHandler } from '@/services/eventStream';
import type { QueueItem } from './transcribeQueueState';

// browsers block several downloads fired at once, so saved transcripts are spaced out
const SAVE_SPACING_MS = 150;

export function useTranscribeQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const shouldStopRef = useRef(false);

  const updateItem = useCallback((id: string, update: (item: QueueItem) => QueueItem) => {
    setItems((previous) => previous.map((item) => (item.id === id ? update(item) : item)));
  }, []);

  const transcribeOne = useCallback((item: QueueItem, modelId: WhisperModelId, language: string) => {
    updateItem(item.id, (current) => ({ ...current, status: 'transcribing', percent: 0, phase: item.file ? 'Uploading...' : 'Starting...', text: '', transcripts: null, outputPaths: [], error: '' }));
    const handler: StreamHandler<TranscriptionEvents> = (...event) => {
      updateItem(item.id, (current) => applyTranscriptionEvent(current, ...event));
    };
    const stream = item.file
      ? api.transcribeUpload(item.file, modelId, language, handler)
      : api.transcribeFile({ filePath: item.localPath, modelId, language, formats: loadSettings().transcription.fileFormats }, handler);
    return stream.finished;
  }, [updateItem]);

  // one file at a time: whisper already uses half the CPU cores for each
  const start = useCallback(async (modelId: WhisperModelId, language: string) => {
    const waiting = items.filter(isWaiting);
    if (waiting.length === 0) return;
    setIsRunning(true);
    shouldStopRef.current = false;
    for (const item of waiting) {
      if (shouldStopRef.current) break;
      await transcribeOne(item, modelId, language);
    }
    setIsRunning(false);
  }, [items, transcribeOne]);

  const stopAfterCurrent = useCallback(() => {
    shouldStopRef.current = true;
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => setItems((previous) => [...previous, ...Array.from(files, itemFromFile)]), []);
  const addPath = useCallback((localPath: string) => setItems((previous) => [...previous, itemFromPath(localPath)]), []);
  const remove = useCallback((id: string) => setItems((previous) => previous.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const saveAll = useCallback((format: TranscriptFormat) => {
    items
      .flatMap((item) => (item.transcripts ? [{ name: item.name, content: item.transcripts[format] }] : []))
      .forEach(({ name, content }, index) => setTimeout(() => saveTextFile(content, transcriptFileName(name, format)), index * SAVE_SPACING_MS));
  }, [items]);

  return { items, isRunning, start, stopAfterCurrent, addFiles, addPath, remove, clear, saveAll };
}

export type TranscribeQueue = ReturnType<typeof useTranscribeQueue>;
