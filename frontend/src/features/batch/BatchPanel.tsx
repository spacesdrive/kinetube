import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { pluralize } from '@/lib/format';
import { buildBatchItems, parseBatchUrls } from './batchResults';
import BatchResultsView from './BatchResultsView';

import type { VideoQuality } from '@shared/downloads.ts';
import type { MediaBulkRequest } from '../downloads/downloadRequests';
import type { BatchState } from './useBatch';

export interface BatchPanelProps {
  batch: BatchState;
  defaultQuality: VideoQuality;
  onBulkDownload(request: MediaBulkRequest): void;
}

const PLACEHOLDER = 'https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/...\nhttps://www.youtube.com/@channel/videos';

export default function BatchPanel({ batch, defaultQuality, onBulkDownload }: BatchPanelProps) {
  const { text, setText, results, isProcessing, process, setSelection, reset } = batch;
  const urlCount = parseBatchUrls(text).length;

  function handleDownload(quality: VideoQuality, shouldTranscribe: boolean) {
    const items = buildBatchItems(results, shouldTranscribe);
    if (items.length > 0) onBulkDownload({ items, quality, isAudioOnly: false });
  }

  return (
    <div className="mx-auto mb-2 mt-6 w-full max-w-3xl animate-fade-slide-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batch download</CardTitle>
          <p className="text-xs text-muted-foreground">Paste several YouTube or Instagram links, one per line</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea aria-label="Links to download" value={text} onChange={(event) => setText(event.target.value)} placeholder={PLACEHOLDER} rows={5} className="resize-none font-mono text-sm" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{urlCount > 0 ? `${pluralize(urlCount, 'link')} found` : 'No links yet'}</span>
            <Button type="button" onClick={() => void process()} disabled={isProcessing || urlCount === 0} size="sm">
              {isProcessing ? <><Spinner className="mr-2 size-3.5" /> Reading the links...</> : 'Read all links'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {results.length > 0 && (
        <BatchResultsView results={results} defaultQuality={defaultQuality} onSelectionChange={setSelection} onDownload={handleDownload} onReset={reset} />
      )}
    </div>
  );
}
