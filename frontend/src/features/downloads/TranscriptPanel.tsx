import { Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

import Notice from '@/components/patterns/Notice';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { countWords } from '@/lib/format';
import { saveTextFile } from '@/lib/saveTextFile';

import type { TranscriptOutcome } from './usePostDownloadTranscription';

export interface TranscriptPanelProps {
  filePath: string;
  isTranscribing: boolean;
  outcome: TranscriptOutcome | null;
  onTranscribe(filePath: string): void;
}

function TranscriptText({ text, outputPath }: { text: string; outputPath: string }) {
  const fileName = outputPath.split(/[\\/]/).pop() || 'transcript.txt';

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcript copied');
    } catch {
      toast.error("kinetube couldn't copy the transcript.", { description: 'Select the text and copy it instead.' });
    }
  }

  return (
    <div className="space-y-2">
      <textarea readOnly aria-label="Transcript" value={text} rows={6} className="w-full resize-none rounded-control bg-app p-3 font-mono text-xs leading-relaxed text-ink-muted outline-none" />
      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{countWords(text)} words, saved beside the video</span>
        <span className="flex gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={() => void copy()}><Copy /> Copy</Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => saveTextFile(text, fileName)}><Save /> Save a copy</Button>
        </span>
      </div>
    </div>
  );
}

export default function TranscriptPanel({ filePath, isTranscribing, outcome, onTranscribe }: TranscriptPanelProps) {
  return (
    <div className="space-y-3 border-t border-divider pt-4">
      <p className="text-label text-ink-faint">Transcription</p>
      {isTranscribing && <p className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-3.5" /> Transcribing...</p>}
      {!isTranscribing && !outcome && (
        <Button type="button" variant="secondary" className="w-full" onClick={() => onTranscribe(filePath)}>Transcribe this file</Button>
      )}
      {outcome?.kind === 'error' && <Notice tone="error">{outcome.message}</Notice>}
      {outcome?.kind === 'text' && <TranscriptText text={outcome.text} outputPath={outcome.outputPath} />}
    </div>
  );
}
