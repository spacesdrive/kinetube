import type { TranscriptFiles, TranscriptionEvents } from '@shared/transcriptions.ts';
import type { StreamEvent } from '@/services/eventStream';

export type QueueItemStatus = 'pending' | 'transcribing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  name: string;
  // a dropped file is uploaded; a typed path names a file already on this computer
  file: File | null;
  localPath: string;
  status: QueueItemStatus;
  percent: number;
  phase: string;
  text: string;
  // every format, ready to save, once the item is done
  transcripts: TranscriptFiles | null;
  // the files written beside a typed path; an uploaded file gets none
  outputPaths: string[];
  error: string;
}

function newId(): string {
  return crypto.randomUUID();
}

export function itemFromFile(file: File): QueueItem {
  return { id: newId(), name: file.name, file, localPath: '', status: 'pending', percent: 0, phase: '', text: '', transcripts: null, outputPaths: [], error: '' };
}

// "C:\Videos\clip.mp4" -> an item named "clip.mp4"
export function itemFromPath(localPath: string): QueueItem {
  const name = localPath.split(/[\\/]/).pop() || localPath;
  return { id: newId(), name, file: null, localPath, status: 'pending', percent: 0, phase: '', text: '', transcripts: null, outputPaths: [], error: '' };
}

export function isWaiting(item: QueueItem): boolean {
  return item.status === 'pending' || item.status === 'error';
}

export function applyTranscriptionEvent(item: QueueItem, ...[event, data]: StreamEvent<TranscriptionEvents>): QueueItem {
  if (event === 'phase') return { ...item, phase: data.message };
  if (event === 'progress') return { ...item, percent: data.percent };
  // whisper prints the text as it goes, so the item fills in before the end
  if (event === 'chunk') return { ...item, text: item.text ? `${item.text} ${data.text}` : data.text };
  if (event !== 'done') return item;
  if (!data.success) return { ...item, status: 'error', error: data.message };
  return { ...item, status: 'done', text: data.text, transcripts: data.transcripts, outputPaths: data.outputPaths, percent: 100 };
}
