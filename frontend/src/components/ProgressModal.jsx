import {
  X,
  CheckCircle,
  XCircle,
  Download,
  Music,
  Check,
  ArrowDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

// ── Spinner SVG (no emoji, no lucide animate issues) ─────────────────────────
function Spinner({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Smooth progress bar ───────────────────────────────────────────────────────
function ProgressBar({ percent, merging }) {
  const width = Math.min(100, Math.max(0, percent || 0));

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
        <span className="font-medium tabular-nums">
          {merging ? 'Merging...' : `${width.toFixed(1)}%`}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-linear ${
            merging
              ? 'w-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-blue-400'
          }`}
          style={merging ? undefined : { width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ── Single video download panel ───────────────────────────────────────────────
function StepBadge({ phase, isMultiFile }) {
  if (!isMultiFile || !phase || phase === 'merging') return null;
  const step = phase === 'video' ? 1 : 2;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase tracking-wide">
      Step {step}/2
    </span>
  );
}

function SingleDownload({ item, onClose, onCancel }) {
  const {
    title,
    percent = 0,
    speed,
    eta,
    filename,
    merging,
    done,
    success,
    message,
    warning,
    audioOnly,
    quality,
    phaseLabel,
    phase,
    isMultiFile,
  } = item;

  return (
    <div className="space-y-4">
      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            done ? (success ? 'bg-green-100' : 'bg-red-100') : 'bg-blue-50'
          }`}
        >
          {done ? (
            success ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <XCircle size={20} className="text-red-600" />
            )
          ) : audioOnly ? (
            <Music size={20} className="text-blue-600" />
          ) : (
            <Download size={20} className="text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {filename || title || 'Preparing download...'}
            </p>
            <StepBadge phase={phase} isMultiFile={isMultiFile} />
          </div>
          <p className="text-xs text-gray-400">
            {audioOnly ? 'Audio Only — MP3' : `Video — ${quality === 'best' ? 'Best Available' : quality}`}
          </p>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {/* Progress while active */}
      {!done && (
        <div className="space-y-2">
          <ProgressBar percent={percent} merging={merging} />
          <div className="flex items-center justify-between text-xs text-gray-400">
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
                  {speed && phaseLabel && <span className="text-gray-300">—</span>}
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
        <div
          className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
            success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Actions */}
      {done ? (
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Close
        </button>
      ) : (
        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          Cancel Download
        </button>
      )}
    </div>
  );
}

// ── Bulk download panel ───────────────────────────────────────────────────────
function BulkDownload({ items, onClose, onCancel }) {
  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const successCount = items.filter((i) => i.done && i.success).length;
  const failCount = items.filter((i) => i.done && !i.success).length;
  const current = items.find((i) => !i.done);
  const overallPercent = total > 0 ? (doneCount / total) * 100 : 0;
  const allDone = doneCount === total;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div>
        <div className="flex justify-between items-center text-sm font-semibold text-gray-700 mb-2">
          <span>Bulk Download</span>
          <span className="tabular-nums text-gray-500">
            {doneCount} / {total}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
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
          <p className="text-sm font-medium text-gray-800 line-clamp-1">{current.title}</p>
          <ProgressBar percent={current.percent} merging={current.merging} />
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            {current.merging ? (
              <>
                <RefreshCw size={11} className="animate-spin text-purple-500" />
                <span className="text-purple-600 font-medium">{current.phaseLabel || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Spinner size={11} className="text-blue-400" />
                <span>{current.phaseLabel || 'Starting...'}</span>
                {current.speed && current.phaseLabel && <span className="text-gray-300">—</span>}
                {current.speed && <span>{current.speed}</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Video queue list */}
      <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
        {items.map((item, i) => (
          <div
            key={item.id || i}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${
              item.done
                ? item.success
                  ? 'bg-green-50'
                  : 'bg-red-50'
                : item === current
                ? 'bg-blue-50'
                : 'bg-gray-50'
            }`}
          >
            <span className="flex-shrink-0 w-4 flex items-center justify-center">
              {item.done ? (
                item.success ? (
                  <Check size={13} className="text-green-500" />
                ) : (
                  <XCircle size={13} className="text-red-500" />
                )
              ) : item === current ? (
                <Spinner size={13} className="text-blue-500" />
              ) : (
                <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
              )}
            </span>
            <span
              className={`truncate flex-1 ${
                item === current
                  ? 'font-medium text-blue-700'
                  : item.done
                  ? item.success
                    ? 'text-green-700'
                    : 'text-red-600'
                  : 'text-gray-400'
              }`}
            >
              {item.title}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {allDone ? (
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Close
        </button>
      ) : (
        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          Cancel Downloads
        </button>
      )}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function ProgressModal({ download, onClose, onCancel }) {
  if (!download) return null;

  const isBulk = Array.isArray(download.items);
  const isDone = isBulk
    ? download.items.every((i) => i.done)
    : download.done;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 relative">
        {/* X button — only after completion */}
        {isDone && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {isBulk ? (
          <BulkDownload items={download.items} onClose={onClose} onCancel={onCancel} />
        ) : (
          <SingleDownload item={download} onClose={onClose} onCancel={onCancel} />
        )}
      </div>
    </div>
  );
}
