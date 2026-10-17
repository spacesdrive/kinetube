import { AudioLines, Download } from 'lucide-react';

import SurfaceBox from '@/components/patterns/SurfaceBox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import type { useWhisperSetup } from './useWhisperSetup';

export interface WhisperSetupAlertProps {
  setup: ReturnType<typeof useWhisperSetup>;
}

export default function WhisperSetupAlert({ setup }: WhisperSetupAlertProps) {
  const { isInstalling, percent, phaseMessage, error, install } = setup;

  return (
    <SurfaceBox className="mx-auto flex max-w-lg flex-col items-center px-8 py-10 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-pill bg-spin-soft text-spin-text"><AudioLines size={20} /></span>
      <h2 className="text-section text-ink">Install whisper.cpp to transcribe</h2>
      <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">The transcription engine downloads once, about 25 MB on Windows. On macOS and Linux it is built from source.</p>
      <div className="mt-6 w-full max-w-xs">
        {isInstalling ? (
          <div className="space-y-2 text-left" aria-live="polite">
            <p className="text-[13px] text-ink-muted">{phaseMessage}</p>
            <Progress value={percent} aria-label="whisper.cpp install progress" />
          </div>
        ) : (
          <Button type="button" size="lg" className="w-full" onClick={install}><Download /> Install whisper.cpp</Button>
        )}
      </div>
      {error && <p role="alert" className="mt-4 text-xs text-error">{error}</p>}
    </SurfaceBox>
  );
}
