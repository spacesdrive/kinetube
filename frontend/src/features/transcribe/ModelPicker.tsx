import { Check, Download, RefreshCw } from 'lucide-react';

import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import type { WhisperModel } from '@shared/transcriptions.ts';
import type { WhisperModels } from './useWhisperModels';

export interface ModelPickerProps {
  whisperModels: WhisperModels;
}

// "Base (~142 MB)" -> "~142 MB"
const sizeText = (label: string): string => label.match(/\((.+)\)/)?.[1] ?? label;

function ModelRow({ model, isSelected, isDownloading, onSelect, onDownload }: { model: WhisperModel; isSelected: boolean; isDownloading: boolean; onSelect(): void; onDownload(): void }) {
  return (
    <li className={cn('flex items-center gap-2 rounded-row pr-1.5 transition-quiet', isSelected ? 'bg-spin-soft' : 'hover:bg-surface-hover')}>
      <button type="button" role="radio" aria-checked={isSelected} disabled={!model.isDownloaded} onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 rounded-row px-2.5 py-2 text-left disabled:cursor-default">
        <span className={cn('flex size-4 flex-shrink-0 items-center justify-center rounded-pill border', isSelected ? 'border-spin bg-spin text-on-spin' : 'border-line-strong')}>
          {isSelected && <Check size={11} strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink capitalize">{model.id}</span>
          <span className="block text-xs text-ink-faint">{sizeText(model.label)}</span>
        </span>
      </button>
      {model.isDownloaded ? (
        <StatusBadge tone="success">On this computer</StatusBadge>
      ) : (
        <Button type="button" variant="outline" size="xs" onClick={onDownload} disabled={isDownloading}>
          {isDownloading ? <Spinner className="size-3" /> : <Download />}
          Download
        </Button>
      )}
    </li>
  );
}

export default function ModelPicker({ whisperModels }: ModelPickerProps) {
  const { models, selectedModelId, setSelectedModelId, downloadingModelId, percent, error, refresh, download } = whisperModels;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink-muted">Whisper model</span>
        <Button type="button" variant="ghost" size="icon-xs" aria-label="Refresh the model list" title="Refresh the model list" onClick={refresh}><RefreshCw /></Button>
      </div>
      <ul role="radiogroup" aria-label="Whisper model" className="-mx-1.5 space-y-0.5">
        {models.map((model) => (
          <ModelRow
            key={model.id}
            model={model}
            isSelected={selectedModelId === model.id}
            isDownloading={downloadingModelId === model.id}
            onSelect={() => setSelectedModelId(model.id)}
            onDownload={() => download(model.id)}
          />
        ))}
      </ul>
      {downloadingModelId && (
        <div className="space-y-1.5 pt-1" aria-live="polite">
          <p className="text-xs text-ink-muted">Downloading the {downloadingModelId} model...</p>
          <Progress value={percent} aria-label="Model download progress" />
        </div>
      )}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}
