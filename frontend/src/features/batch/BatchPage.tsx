import PageHeader from '@/components/patterns/PageHeader';
import SurfaceBox from '@/components/patterns/SurfaceBox';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { pluralize } from '@/lib/format';
import { buildBatchItems, parseBatchUrls } from './batchResults';
import BatchResultsView from './BatchResultsView';

import type { VideoQuality } from '@shared/downloads.ts';
import type { MediaBulkRequest } from '../downloads/downloadRequests';
import type { BatchState } from './useBatch';

export interface BatchPageProps {
  batch: BatchState;
  defaultQuality: VideoQuality;
  onBulkDownload(request: MediaBulkRequest): void;
}

const PLACEHOLDER = 'https://www.youtube.com/watch?v=...\nhttps://www.youtube.com/playlist?list=...\nhttps://www.instagram.com/reel/...';

export default function BatchPage({ batch, defaultQuality, onBulkDownload }: BatchPageProps) {
  const { text, setText, results, isProcessing, process, setSelection, reset } = batch;
  const urlCount = parseBatchUrls(text).length;

  function handleDownload(quality: VideoQuality, shouldTranscribe: boolean) {
    const items = buildBatchItems(results, shouldTranscribe);
    if (items.length > 0) onBulkDownload({ items, quality, isAudioOnly: false });
  }

  return (
    <div className="mx-auto max-w-[var(--content-narrow)] space-y-8">
      <PageHeader title="Batch download" description="Paste YouTube and Instagram links, one per line. Videos and posts start selected. Open a channel, a playlist or a profile to pick from it." />
      <SurfaceBox className="space-y-4">
        <Textarea aria-label="Links to download" value={text} onChange={(event) => setText(event.target.value)} placeholder={PLACEHOLDER} rows={6} className="resize-none bg-app font-mono text-[13px]" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-ink-muted">{urlCount > 0 ? `${pluralize(urlCount, 'link')} found` : 'No links yet'}</span>
          <Button type="button" onClick={() => void process()} disabled={isProcessing || urlCount === 0}>
            {isProcessing ? <><Spinner className="size-4" /> Reading the links</> : 'Read the links'}
          </Button>
        </div>
      </SurfaceBox>
      {results.length > 0 && (
        <BatchResultsView results={results} defaultQuality={defaultQuality} onSelectionChange={setSelection} onDownload={handleDownload} onReset={reset} />
      )}
    </div>
  );
}
