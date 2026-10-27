import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import Notice from '@/components/patterns/Notice';
import SaveTranscriptMenu from '@/components/SaveTranscriptMenu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { countWords } from '@/lib/format';
import { saveTextFile, transcriptFileName } from '@/lib/saveTextFile';
import { formatList, formatsOfFiles } from '@/lib/transcriptFormats';

import type { TranscriptFiles } from '@shared/transcriptions.ts';
import type { TranscriptOutcome } from './usePostDownloadTranscription';

export interface TranscriptPanelProps {
  filePath: string;
  isTranscribing: boolean;
  percent: number;
  outcome: TranscriptOutcome | null;
  onTranscribe(filePath: string): void;
}

interface TranscriptTextProps {
  filePath: string;
  text: string;
  transcripts: TranscriptFiles;
  outputPaths: string[];
}

function TranscriptText({ filePath, text, transcripts, outputPaths }: TranscriptTextProps) {
  const mediaName = filePath.split(/[\\/]/).pop() || 'transcript';

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
        <span>{countWords(text)} words, saved beside the video as {formatList(formatsOfFiles(outputPaths))}</span>
        <span className="flex gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={() => void copy()}><Copy /> Copy</Button>
          <SaveTranscriptMenu label="Save a copy" variant="ghost" onSave={(format) => saveTextFile(transcripts[format], transcriptFileName(mediaName, format))} />
        </span>
      </div>
    </div>
  );
}

export default function TranscriptPanel({ filePath, isTranscribing, percent, outcome, onTranscribe }: TranscriptPanelProps) {
  return (
    <div className="space-y-3 border-t border-divider pt-4">
      <p className="text-label text-ink-faint">Transcription</p>
      {isTranscribing && (
        <div className="space-y-2" aria-live="polite">
          <Progress value={percent} aria-label="Transcription progress" />
          <p className="flex items-center gap-2 text-xs text-ink-muted"><Spinner className="size-3" /> Transcribing with Whisper. The files are saved beside the download when it finishes.</p>
        </div>
      )}
      {!isTranscribing && !outcome && (
        <Button type="button" variant="secondary" className="w-full" onClick={() => onTranscribe(filePath)}>Transcribe this file</Button>
      )}
      {outcome?.kind === 'error' && <Notice tone="error">{outcome.message}</Notice>}
      {outcome?.kind === 'text' && <TranscriptText filePath={filePath} text={outcome.text} transcripts={outcome.transcripts} outputPaths={outcome.outputPaths} />}
    </div>
  );
}
