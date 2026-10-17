import { X } from 'lucide-react';

import MetricBox from '@/components/patterns/MetricBox';
import SectionHeader from '@/components/patterns/SectionHeader';
import { Button } from '@/components/ui/button';
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
    <section className="space-y-4">
      <SectionHeader title="Links" actions={<Button type="button" variant="ghost" size="sm" onClick={onReset}><X /> Clear</Button>} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricBox label="To read" value={waitingCount} />
        <MetricBox label="Ready" value={readyCount} tone="success" />
        <MetricBox label="Failed" value={errorCount} tone={errorCount > 0 ? 'error' : 'neutral'} />
        <MetricBox label="Selected" value={selectedCount} tone="accent" />
      </div>
      <ul className="space-y-2">
        {results.map((result, index) => (
          <li key={result.url}>
            <ResultCard result={result} onSelectionChange={(selectedIds) => onSelectionChange(index, selectedIds)} />
          </li>
        ))}
      </ul>
      {selectedCount > 0 && <BatchDownloadBar selectedCount={selectedCount} defaultQuality={defaultQuality} onDownload={onDownload} />}
    </section>
  );
}
