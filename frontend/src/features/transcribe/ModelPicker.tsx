import { Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import type { WhisperModel } from '@shared/transcriptions.ts';
import type { WhisperModels } from './useWhisperModels';

export interface ModelPickerProps {
  whisperModels: WhisperModels;
}

function cardClass(isSelected: boolean, isDownloaded: boolean): string {
  if (isSelected) return 'border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500/30';
  if (isDownloaded) return 'border-border bg-card hover:border-muted-foreground/30';
  return 'cursor-default border-border bg-muted opacity-75';
}

// "Base (~142 MB)" -> "~142 MB"
const sizeText = (label: string): string => label.match(/\((.+)\)/)?.[1] ?? label;

function ModelCard({ model, isSelected, isDownloading, onSelect, onDownload }: { model: WhisperModel; isSelected: boolean; isDownloading: boolean; onSelect(): void; onDownload(): void }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border p-3 transition-all duration-150', cardClass(isSelected, model.isDownloaded))}>
      <button type="button" disabled={!model.isDownloaded} aria-pressed={isSelected} onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', model.isDownloaded ? 'bg-green-400' : 'bg-muted-foreground/30')} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold capitalize">{model.id}</span>
          <span className="block text-xs text-muted-foreground">{sizeText(model.label)}</span>
        </span>
        {isSelected && <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full bg-purple-500" />}
      </button>
      {!model.isDownloaded && (
        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onDownload} disabled={isDownloading}>
          {isDownloading ? <Spinner className="mr-1 size-3" /> : <Download size={11} className="mr-1" />}
          Download
        </Button>
      )}
    </div>
  );
}

export default function ModelPicker({ whisperModels }: ModelPickerProps) {
  const { models, selectedModelId, setSelectedModelId, downloadingModelId, percent, error, refresh, download } = whisperModels;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Whisper model</CardTitle>
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh the model list" className="h-7 w-7" onClick={refresh}><RefreshCw size={13} /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModelId === model.id}
              isDownloading={downloadingModelId === model.id}
              onSelect={() => setSelectedModelId(model.id)}
              onDownload={() => download(model.id)}
            />
          ))}
        </div>
        {downloadingModelId && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground">Downloading the {downloadingModelId} model...</p>
            <Progress value={percent} className="h-1.5 [&>div]:bg-purple-500" />
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
