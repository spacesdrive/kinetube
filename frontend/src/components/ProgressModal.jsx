import {
  X, CheckCircle, XCircle, Download, Music, Check, ArrowDown, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// ── Progress bar with merge animation ────────────────────────────────────────
function DownloadProgress({ percent, merging }) {
  const width = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium tabular-nums">{merging ? 'Merging...' : `${width.toFixed(1)}%`}</span>
      </div>
      {merging ? (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
        </div>
      ) : (
        <Progress value={width} className="h-2" />
      )}
    </div>
  );
}

// ── Step badge for multi-file downloads ───────────────────────────────────────
function StepBadge({ phase, isMultiFile }) {
  if (!isMultiFile || !phase || phase === 'merging') return null;
  const step = phase === 'video' ? 1 : 2;
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
      Step {step}/2
    </Badge>
  );
}

// ── Single download panel ─────────────────────────────────────────────────────
function SingleDownload({ item, onClose, onCancel, onTranscribe, transcribing, transcribeResult }) {
  const {
    title, percent = 0, speed, eta, filename, merging, done, success,
    message, warning, audioOnly, quality, phaseLabel, phase, isMultiFile, filePath,
  } = item;

  return (
    <div className="space-y-4">
      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          done ? (success ? 'bg-green-100' : 'bg-red-100') : 'bg-blue-50'
        )}>
          {done ? (
            success
              ? <CheckCircle size={20} className="text-green-600" />
              : <XCircle size={20} className="text-red-600" />
          ) : audioOnly
            ? <Music size={20} className="text-blue-600" />
            : <Download size={20} className="text-blue-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-sm leading-snug line-clamp-2">
              {filename || title || 'Preparing download...'}
            </p>
            <StepBadge phase={phase} isMultiFile={isMultiFile} />
          </div>
          <p className="text-xs text-muted-foreground">
            {audioOnly ? 'Audio Only — MP3' : `Video — ${quality === 'best' ? 'Best Available' : quality}`}
          </p>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">{warning}</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {!done && (
        <div className="space-y-2">
          <DownloadProgress percent={percent} merging={merging} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {merging ? (
                <>
                  <RefreshCw size={11} className="animate-spin text-purple-500" />
                  <span className="text-purple-600 font-medium">{phaseLabel || 'Processing...'}</span>
                </>
              ) : (
                <>
                  <Spinner size={11} className="text-blue-400" />
                  <span>{phaseLabel || (speed ? speed : 'Starting...')}</span>
                  {speed && phaseLabel && <span className="text-muted-foreground/50">—</span>}
                  {speed && phaseLabel && <span>{speed}</span>}
                </>
              )}
            </span>
            {eta && !merging && <span>ETA {eta}</span>}
          </div>
        </div>
      )}

      {/* Done message */}
      {done && (
        <div className={cn(
          'rounded-xl px-3 py-2.5 text-sm font-medium',
          success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {message}
        </div>
      )}

      {/* Transcription panel */}
      {done && success && filePath && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transcription</p>

          {transcribing && (
            <div className="flex items-center gap-2.5 bg-blue-50 rounded-xl px-3 py-2.5 text-sm text-blue-700">
              <Spinner size={14} className="text-blue-500" />
              <span className="font-medium">Transcribing…</span>
            </div>
          )}

          {!transcribing && !transcribeResult?.text && !transcribeResult?.error && (
            <Button
              variant="default"
              className="w-full"
              onClick={() => onTranscribe?.(filePath)}
            >
              Transcribe this file
            </Button>
          )}

          {transcribeResult?.error && (
            <Alert variant="destructive" className="py-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{transcribeResult.error}</AlertDescription>
            </Alert>
          )}

          {transcribeResult?.text && (
            <div className="space-y-2">
              <textarea
                readOnly
                value={transcribeResult.text}
                rows={6}
                className="w-full text-xs text-muted-foreground bg-muted/50 border rounded-xl p-3 resize-none outline-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{transcribeResult.text.split(/\s+/).filter(Boolean).length} words</span>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([transcribeResult.text], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = (transcribeResult.outputTxt?.split(/[\\/]/).pop()) || 'transcript.txt';
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="font-semibold text-primary hover:underline transition-colors"
                >
                  Save .txt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {done ? (
        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      ) : (
        <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={onCancel}>
          Cancel Download
        </Button>
      )}
    </div>
  );
}

// ── Bulk download panel ───────────────────────────────────────────────────────
function BulkDownload({ items, onClose, onCancel }) {
  const total        = items.length;
  const doneCount    = items.filter((i) => i.done).length;
  const successCount = items.filter((i) => i.done && i.success).length;
  const failCount    = items.filter((i) => i.done && !i.success).length;
  const current      = items.find((i) => !i.done);
  const overallPct   = total > 0 ? (doneCount / total) * 100 : 0;
  const allDone      = doneCount === total;

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div>
        <div className="flex justify-between items-center text-sm font-semibold mb-2">
          <span>Bulk Download</span>
          <span className="tabular-nums text-muted-foreground">{doneCount} / {total}</span>
        </div>
        <Progress value={overallPct} className="h-2" />
        <div className="flex gap-4 mt-2 text-xs">
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <Check size={11} /> {successCount} done
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <XCircle size={11} /> {failCount} failed
            </span>
          )}
          {!allDone && current && (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <ArrowDown size={11} /> Downloading...
            </span>
          )}
        </div>
      </div>

      {/* Current video */}
      {current && (
        <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Now downloading</p>
          <p className="text-sm font-medium line-clamp-1">{current.title}</p>
          <DownloadProgress percent={current.percent} merging={current.merging} />
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {current.merging ? (
              <>
                <RefreshCw size={11} className="animate-spin text-purple-500" />
                <span className="text-purple-600 font-medium">{current.phaseLabel || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Spinner size={11} className="text-blue-400" />
                <span>{current.phaseLabel || 'Starting...'}</span>
                {current.speed && current.phaseLabel && <span className="opacity-50">—</span>}
                {current.speed && <span>{current.speed}</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Queue */}
      <ScrollArea className="max-h-44">
        <div className="space-y-1 pr-1">
          {items.map((item, i) => (
            <div
              key={item.id || i}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs',
                item.done
                  ? item.success ? 'bg-green-50' : 'bg-red-50'
                  : item === current ? 'bg-blue-50' : 'bg-muted/50'
              )}
            >
              <span className="flex-shrink-0 w-4 flex items-center justify-center">
                {item.done ? (
                  item.success
                    ? <Check size={13} className="text-green-500" />
                    : <XCircle size={13} className="text-red-500" />
                ) : item === current ? (
                  <Spinner size={13} className="text-blue-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                )}
              </span>
              {item.platform && (
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: item.platform === 'instagram' ? '#ec4899' : '#ef4444' }}
                />
              )}
              <span className={cn(
                'truncate flex-1',
                item === current
                  ? 'font-medium text-blue-700'
                  : item.done
                    ? item.success ? 'text-green-700' : 'text-red-600'
                    : 'text-muted-foreground'
              )}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {allDone ? (
        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      ) : (
        <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={onCancel}>
          Cancel Downloads
        </Button>
      )}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function ProgressModal({ download, onClose, onCancel, onTranscribe, transcribing, transcribeResult }) {
  if (!download) return null;

  const isBulk = Array.isArray(download.items);
  const isDone = isBulk ? download.items.every((i) => i.done) : download.done;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && isDone) onClose(); }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => { if (!isDone) e.preventDefault(); }}>
        <DialogTitle className="sr-only">Download Progress</DialogTitle>
        {isDone && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {isBulk ? (
          <BulkDownload items={download.items} onClose={onClose} onCancel={onCancel} />
        ) : (
          <SingleDownload
            item={download}
            onClose={onClose}
            onCancel={onCancel}
            onTranscribe={onTranscribe}
            transcribing={transcribing}
            transcribeResult={transcribeResult}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
