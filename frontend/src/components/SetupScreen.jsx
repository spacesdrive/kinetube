import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function fmtBytes(b) {
  if (!b || b <= 0) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtSpeed(bps) {
  if (!bps || bps <= 0) return '';
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
}

const TOOLS = {
  ytdlp: {
    label: 'yt-dlp',
    sub: 'YouTube download engine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  ffmpeg: {
    label: 'FFmpeg',
    sub: 'Audio & video processor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
  },
};

const INITIAL_TOOL = { phase: 'waiting', percent: 0, speed: 0, downloaded: 0, total: 0, message: '' };

function ToolRow({ toolKey, state, delay }) {
  const { label, sub, icon } = TOOLS[toolKey];
  const { phase, percent, speed, downloaded, total, message } = state;

  const isDone     = phase === 'done';
  const isError    = phase === 'error';
  const isDownload = phase === 'downloading';
  const isExtract  = phase === 'extracting';
  const isActive   = isDownload || isExtract;
  const isWaiting  = phase === 'waiting';

  const statusLabel = { waiting: 'Waiting', downloading: 'Downloading', extracting: 'Extracting', done: 'Ready', error: 'Failed' }[phase] ?? 'Waiting';
  const displayPercent = Math.max(0, Math.min(100, percent));

  const iconBg = isDone ? 'bg-emerald-500' : isError ? 'bg-red-500' : isActive ? 'bg-blue-500' : 'bg-white/20';
  const cardBorder = isDone
    ? 'border-emerald-400/30'
    : isError ? 'border-red-400/30'
    : isActive ? 'border-blue-400/30'
    : 'border-white/10';

  const badgeClass = {
    waiting:     'bg-white/10 text-slate-300',
    downloading: 'bg-blue-500/20 text-blue-300',
    extracting:  'bg-indigo-500/20 text-indigo-300',
    done:        'bg-emerald-500/20 text-emerald-300',
    error:       'bg-red-500/20 text-red-300',
  }[phase] ?? 'bg-white/10 text-slate-300';

  const progressColor = isDone ? '[&>div]:bg-emerald-500' : isError ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500';

  return (
    <div
      className="animate-fade-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: 0 }}
    >
      <div className={cn('bg-white/5 backdrop-blur-sm rounded-2xl border p-5 transition-all duration-500', cardBorder)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all duration-500', iconBg)}>
              {isDone ? (
                <span className="animate-check-pop"><CheckCircle size={20} /></span>
              ) : isError ? (
                <XCircle size={20} />
              ) : icon}
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', badgeClass)}>
            {isActive && (
              <svg className="animate-spin w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isDone && <CheckCircle size={11} className="flex-shrink-0" />}
            {isError && <XCircle size={11} className="flex-shrink-0" />}
            {statusLabel}
          </span>
        </div>

        <Progress value={displayPercent} className={cn('h-2.5 bg-white/10 mb-2.5', progressColor)} />

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {isActive && total > 0
              ? `${fmtBytes(downloaded)} / ${fmtBytes(total)}`
              : isActive ? (fmtBytes(downloaded) || 'Connecting...')
              : isWaiting ? 'Waiting for previous step...'
              : (message || (isDone ? 'Installed successfully' : 'Failed'))}
          </span>
          <span className={cn('font-medium tabular-nums', isDone ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-slate-400')}>
            {isActive ? (speed > 0 ? fmtSpeed(speed) : '') : `${Math.round(displayPercent)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SetupScreen({ onComplete }) {
  const [tools, setTools]   = useState({ ytdlp: { ...INITIAL_TOOL }, ffmpeg: { ...INITIAL_TOOL } });
  const [allDone, setAllDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneHandled = useRef(false);

  const handleDone = () => {
    if (doneHandled.current) return;
    doneHandled.current = true;
    setAllDone(true);
    setTimeout(() => { setLeaving(true); setTimeout(onComplete, 600); }, 1200);
  };

  useEffect(() => {
    const es = new EventSource('/api/setup');

    es.addEventListener('phase', (e) => {
      const data = JSON.parse(e.data);
      const key = data.tool;
      setTools((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          phase:   data.phase,
          message: data.message || '',
          percent: (data.phase === 'done' || data.phase === 'skipped') ? 100 : prev[key].percent,
        },
      }));
      if (data.phase === 'error') setHasError(true);
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      const key = data.tool;
      setTools((prev) => ({
        ...prev,
        [key]: { ...prev[key], percent: data.percent ?? 0, speed: data.speed ?? 0, downloaded: data.downloaded ?? 0, total: data.total ?? 0 },
      }));
    });

    es.addEventListener('done', () => { es.close(); handleDone(); });
    es.onerror = () => { if (doneHandled.current) return; es.close(); handleDone(); };
    return () => es.close();
  }, []);

  const bothDone = tools.ytdlp.phase === 'done' && tools.ffmpeg.phase === 'done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ opacity: leaving ? 0 : 1, transition: 'opacity 0.6s ease' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="animate-scale-in relative w-full max-w-md z-10" style={{ animationFillMode: 'both' }}>
        <div
          className="text-center mb-8 animate-fade-slide-up"
          style={{ animationDelay: '0ms', animationFillMode: 'both', opacity: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/40 mb-4">
            <img src="/favicon.png" alt="KineTube" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {bothDone ? 'All set!' : 'Setting up KineTube'}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            {bothDone
              ? 'Launching the app...'
              : 'Downloading the required tools. This only happens once.'}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <ToolRow toolKey="ytdlp"  state={tools.ytdlp}  delay={150} />
          <ToolRow toolKey="ffmpeg" state={tools.ffmpeg} delay={280} />
        </div>

        <div
          className="animate-fade-slide-up text-center"
          style={{ animationDelay: '400ms', animationFillMode: 'both', opacity: 0 }}
        >
          {allDone ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle size={16} />
              Ready — launching KineTube
            </div>
          ) : hasError ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
                <AlertTriangle size={15} />
                Some tools failed to install. Downloads may be limited.
              </div>
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-white/10"
                onClick={handleDone}
              >
                Continue anyway
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Do not close this window while setup is running</p>
          )}
        </div>
      </div>
    </div>
  );
}
