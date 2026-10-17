import { XCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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

  return (
    <div className="space-y-2">
      <textarea
        readOnly
        aria-label="Transcript"
        value={text}
        rows={6}
        className="w-full resize-none rounded-xl border bg-muted/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground outline-none"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{countWords(text)} words, saved beside the video</span>
        <button type="button" onClick={() => saveTextFile(text, fileName)} className="font-semibold text-primary hover:underline">
          Save a copy
        </button>
      </div>
    </div>
  );
}

export default function TranscriptPanel({ filePath, isTranscribing, outcome, onTranscribe }: TranscriptPanelProps) {
  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transcription</p>

      {isTranscribing && (
        <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
          <Spinner className="size-3.5 text-blue-500" />
          <span className="font-medium">Transcribing...</span>
        </div>
      )}
      {!isTranscribing && !outcome && (
        <Button type="button" className="w-full" onClick={() => onTranscribe(filePath)}>
          Transcribe this file
        </Button>
      )}
      {outcome?.kind === 'error' && (
        <Alert variant="destructive" className="py-2">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{outcome.message}</AlertDescription>
        </Alert>
      )}
      {outcome?.kind === 'text' && <TranscriptText text={outcome.text} outputPath={outcome.outputPath} />}
    </div>
  );
}
