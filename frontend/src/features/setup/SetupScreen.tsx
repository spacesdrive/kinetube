import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import ToolRow from './ToolRow';
import { useToolSetup } from './useToolSetup';

export interface SetupScreenProps {
  onComplete(): void;
}

// a short pause on "All set" so the person sees setup worked, then a fade before the app appears
const SUCCESS_PAUSE_MS = 1_200;
const FADE_OUT_MS = 600;

function Footer({ isAllDone, hasError, isFinished, onContinue }: { isAllDone: boolean; hasError: boolean; isFinished: boolean; onContinue(): void }) {
  if (isAllDone) {
    return <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400"><CheckCircle size={16} /> Ready. Opening KineTube...</div>;
  }
  if (hasError && isFinished) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-amber-400"><AlertTriangle size={15} /> Some tools didn't install, so some downloads won't work yet.</div>
        <Button type="button" variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/20" onClick={onContinue}>Continue anyway</Button>
      </div>
    );
  }
  return <p className="text-xs text-slate-500">Keep this window open while setup runs</p>;
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const { tools, isFinished, hasError, isAllDone } = useToolSetup();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isAllDone) return;
    const leaveTimer = setTimeout(() => setIsLeaving(true), SUCCESS_PAUSE_MS);
    const doneTimer = setTimeout(onComplete, SUCCESS_PAUSE_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [isAllDone, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500" style={{ opacity: isLeaving ? 0 : 1 }}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/3 h-72 w-72 rounded-full bg-indigo-600/15 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/40">
            <img src="/favicon.png" alt="" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{isAllDone ? 'All set' : 'Setting up KineTube'}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{isAllDone ? 'Opening the app...' : 'Downloading the tools KineTube needs. This happens only once.'}</p>
        </div>
        <div className="mb-5 space-y-3">
          <ToolRow toolId="ytdlp" state={tools.ytdlp} delayMs={150} />
          <ToolRow toolId="ffmpeg" state={tools.ffmpeg} delayMs={280} />
        </div>
        <div className="text-center">
          <Footer isAllDone={isAllDone} hasError={hasError} isFinished={isFinished} onContinue={onComplete} />
        </div>
      </div>
    </div>
  );
}
