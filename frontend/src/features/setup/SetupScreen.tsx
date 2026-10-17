import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import BrandMark from '@/components/shell/BrandMark';
import { Button } from '@/components/ui/button';
import ToolRow from './ToolRow';
import { useToolSetup } from './useToolSetup';

export interface SetupScreenProps {
  onComplete(): void;
}

// a short pause on "All set" so the person sees setup worked, then a fade before the app appears
const SUCCESS_PAUSE_MS = 1_200;
const FADE_OUT_MS = 480;

function Footer({ isAllDone, hasError, isFinished, onContinue }: { isAllDone: boolean; hasError: boolean; isFinished: boolean; onContinue(): void }) {
  if (isAllDone) return <p className="flex items-center justify-center gap-2 text-sm font-medium text-success"><CheckCircle2 size={16} /> Ready. Opening kinetube...</p>;
  if (hasError && isFinished) {
    return (
      <div className="space-y-3">
        <p className="flex items-center justify-center gap-2 text-sm text-warning"><AlertTriangle size={15} /> Some tools didn't install, so some downloads won't work yet.</p>
        <Button type="button" variant="inverse" onClick={onContinue}>Continue anyway</Button>
      </div>
    );
  }
  return <p className="text-xs text-ink-faint">Keep this window open while setup runs.</p>;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app p-4 transition-opacity duration-500" style={{ opacity: isLeaving ? 0 : 1 }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-5 size-12 animate-spin-once" />
          <h1 className="text-page-title text-ink">{isAllDone ? 'All set' : 'Setting up kinetube'}</h1>
          <p className="mt-2 text-[13px] text-ink-muted">{isAllDone ? 'Opening the app...' : 'Downloading the tools kinetube needs. This happens only once.'}</p>
        </div>
        <div className="mb-6 space-y-2">
          <ToolRow toolId="ytdlp" state={tools.ytdlp} />
          <ToolRow toolId="ffmpeg" state={tools.ffmpeg} />
        </div>
        <div className="text-center"><Footer isAllDone={isAllDone} hasError={hasError} isFinished={isFinished} onContinue={onComplete} /></div>
      </div>
    </div>
  );
}
