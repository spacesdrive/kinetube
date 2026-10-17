import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { countWords } from '@/lib/format';
import { saveTextFile, transcriptFileName } from '@/lib/saveTextFile';

import type { QueueItem } from './transcribeQueueState';

export interface QueueItemCardProps {
  item: QueueItem;
  canRemove: boolean;
  onRemove(itemId: string): void;
}

function StatusIcon({ item }: { item: QueueItem }) {
  if (item.status === 'transcribing') return <Spinner className="size-3.5 text-purple-500" />;
  if (item.status === 'done') return <CheckCircle size={15} className="text-green-500" />;
  if (item.status === 'error') return <AlertTriangle size={15} className="text-red-500" />;
  return <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />;
}

function StatusText({ item }: { item: QueueItem }) {
  if (item.status === 'transcribing') return <p className="truncate text-xs text-purple-500">{item.phase}</p>;
  if (item.status === 'done') return <p className="text-xs text-muted-foreground">{countWords(item.text)} words</p>;
  if (item.status === 'error') return <p className="truncate text-xs text-red-400">{item.error}</p>;
  return <p className="text-xs text-muted-foreground">Waiting</p>;
}

export default function QueueItemCard({ item, canRemove, onRemove }: QueueItemCardProps) {
  const [isTextShown, setIsTextShown] = useState(false);
  const isDone = item.status === 'done';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex w-5 flex-shrink-0 justify-center"><StatusIcon item={item} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <StatusText item={item} />
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {isDone && (
              <>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void navigator.clipboard.writeText(item.text)}>Copy</Button>
                <Button type="button" size="sm" className="h-7 text-xs" onClick={() => saveTextFile(item.text, transcriptFileName(item.name))}><Download size={11} className="mr-1" /> Save</Button>
                <Button type="button" variant="ghost" size="icon" aria-label={isTextShown ? 'Hide the transcript' : 'Show the transcript'} className="h-7 w-7" onClick={() => setIsTextShown((isShown) => !isShown)}>
                  {isTextShown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>
              </>
            )}
            {canRemove && item.status !== 'transcribing' && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.name}`} className="h-7 w-7 text-muted-foreground/50 hover:text-red-400" onClick={() => onRemove(item.id)}><X size={13} /></Button>
            )}
          </div>
        </div>

        {item.status === 'transcribing' && (
          <div className="px-4 pb-3">
            {item.percent === 0 ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-100"><div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-pink-500" /></div>
            ) : (
              <Progress value={item.percent} className="h-1.5 [&>div]:bg-purple-500" />
            )}
          </div>
        )}
        {isDone && isTextShown && (
          <div className="border-t bg-muted/30 px-4 pb-4">
            <Textarea readOnly aria-label="Transcript" value={item.text} rows={6} className="mt-3 resize-y font-mono text-sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
