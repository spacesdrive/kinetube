import { AlertTriangle, CheckCircle2, ChevronDown, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import SaveTranscriptMenu from '@/components/SaveTranscriptMenu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { countWords } from '@/lib/format';
import { saveTextFile, transcriptFileName } from '@/lib/saveTextFile';
import { formatList, formatsOfFiles } from '@/lib/transcriptFormats';
import { cn } from '@/lib/utils';

import type { QueueItem } from './transcribeQueueState';

export interface QueueItemCardProps {
  item: QueueItem;
  canRemove: boolean;
  onRemove(itemId: string): void;
}

function StatusIcon({ item }: { item: QueueItem }) {
  if (item.status === 'transcribing') return <Spinner className="size-4 text-spin-text" />;
  if (item.status === 'done') return <CheckCircle2 size={16} className="text-success" />;
  if (item.status === 'error') return <AlertTriangle size={16} className="text-error" />;
  return <span className="size-2.5 rounded-pill bg-line-strong" />;
}

// only a typed path gets files written beside it; an uploaded copy is deleted
function savedBeside(item: QueueItem): string {
  return item.outputPaths.length > 0 ? `, saved beside the file as ${formatList(formatsOfFiles(item.outputPaths))}` : '';
}

function StatusText({ item }: { item: QueueItem }) {
  if (item.status === 'transcribing') return <p className="truncate text-xs text-ink-muted">{item.phase}</p>;
  if (item.status === 'done') return <p className="truncate text-xs text-ink-muted">{countWords(item.text)} words{savedBeside(item)}</p>;
  if (item.status === 'error') return <p className="truncate text-xs text-error">{item.error}</p>;
  return <p className="text-xs text-ink-faint">Waiting</p>;
}

export default function QueueItemCard({ item, canRemove, onRemove }: QueueItemCardProps) {
  const [isTextShown, setIsTextShown] = useState(false);
  const isDone = item.status === 'done';

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcript copied', { description: item.name });
    } catch {
      toast.error("kinetube couldn't copy the transcript.", { description: 'Open it and copy the text instead.' });
    }
  }

  return (
    <li className="overflow-hidden rounded-control bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex w-5 flex-shrink-0 justify-center"><StatusIcon item={item} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{item.name}</p>
          <StatusText item={item} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {item.status === 'done' && item.transcripts && (
            <>
              <Button type="button" variant="ghost" size="xs" onClick={() => void copy(item.text)}><Copy /> Copy</Button>
              <SaveTranscriptMenu label="Save" onSave={(format) => { if (item.transcripts) saveTextFile(item.transcripts[format], transcriptFileName(item.name, format)); }} />
              <Button type="button" variant="ghost" size="icon-xs" aria-expanded={isTextShown} aria-label={isTextShown ? 'Hide the transcript' : 'Show the transcript'} onClick={() => setIsTextShown((isShown) => !isShown)}>
                <ChevronDown className={cn('transition-transform duration-200', isTextShown && 'rotate-180')} />
              </Button>
            </>
          )}
          {canRemove && item.status !== 'transcribing' && (
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${item.name}`} title="Remove from the queue" onClick={() => onRemove(item.id)}><X /></Button>
          )}
        </div>
      </div>
      {item.status === 'transcribing' && (
        <div className="px-4 pb-3">
          {item.percent === 0 ? (
            <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-selected"><div className="absolute inset-y-0 w-1/3 animate-shimmer rounded-full bg-spin" /></div>
          ) : (
            <Progress value={item.percent} aria-label={`Progress for ${item.name}`} />
          )}
        </div>
      )}
      {isDone && isTextShown && (
        <div className="border-t border-divider px-4 pt-3 pb-4">
          <Textarea readOnly aria-label="Transcript" value={item.text} rows={6} className="resize-y bg-app font-mono text-[13px]" />
        </div>
      )}
    </li>
  );
}
