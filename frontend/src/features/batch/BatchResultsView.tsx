import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { countSelected, isCollection } from './batchResults';
import BatchDownloadBar from './BatchDownloadBar';
import { ErrorCard, WaitingCard } from './BatchStatusCards';
import CollectionResultCard from './CollectionResultCard';
import SingleResultCard from './SingleResultCard';

import type { VideoQuality } from '@shared/downloads.ts';
import type { BatchResult } from './batchResults';

export interface BatchResultsViewProps {
  results: BatchResult[];
  defaultQuality: VideoQuality;
  onSelectionChange(index: number, selectedIds: ReadonlySet<string>): void;
  onDownload(quality: VideoQuality, shouldTranscribe: boolean): void;
  onReset(): void;
}

function ResultCard({ result, onSelectionChange }: { result: BatchResult; onSelectionChange(selectedIds: ReadonlySet<string>): void }) {
  if (result.status === 'error') return <ErrorCard url={result.url} message={result.message} />;
  if (result.status !== 'ready') return <WaitingCard url={result.url} isLoading={result.status === 'loading'} />;
  if (isCollection(result.found)) return <CollectionResultCard found={result.found} selectedIds={result.selectedIds} onSelectionChange={onSelectionChange} />;
  return <SingleResultCard found={result.found} selectedIds={result.selectedIds} onSelectionChange={onSelectionChange} />;
}

export default function BatchResultsView({ results, defaultQuality, onSelectionChange, onDownload, onReset }: BatchResultsViewProps) {
  const selectedCount = countSelected(results);
  const readyCount = results.filter((result) => result.status === 'ready').length;
  const errorCount = results.filter((result) => result.status === 'error').length;
  const waitingCount = results.length - readyCount - errorCount;

  return (
    <div className="mx-auto mt-4 w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {waitingCount > 0 && <span className="flex items-center gap-1.5"><Spinner className="size-3" /> {waitingCount} to read</span>}
          {readyCount > 0 && <span className="font-medium text-green-600">{readyCount} ready</span>}
          {errorCount > 0 && <span className="text-red-500">{errorCount} failed</span>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs"><X size={12} /> Clear</Button>
      </div>

      {results.map((result, index) => (
        <ResultCard key={result.url} result={result} onSelectionChange={(selectedIds) => onSelectionChange(index, selectedIds)} />
      ))}
      {selectedCount > 0 && <BatchDownloadBar selectedCount={selectedCount} defaultQuality={defaultQuality} onDownload={onDownload} />}
    </div>
  );
}
