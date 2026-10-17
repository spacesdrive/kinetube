import { AlertTriangle, Download } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import type { useWhisperSetup } from './useWhisperSetup';

export interface WhisperSetupAlertProps {
  setup: ReturnType<typeof useWhisperSetup>;
}

export default function WhisperSetupAlert({ setup }: WhisperSetupAlertProps) {
  const { isInstalling, percent, phaseMessage, error, install } = setup;

  return (
    <Alert variant="default" className="mb-6 border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-800">whisper.cpp isn't installed</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-3">The transcription engine is downloaded once, about 25 MB on Windows. On macOS and Linux it is built from source.</p>
        {isInstalling ? (
          <div className="space-y-2">
            <p className="text-sm">{phaseMessage}</p>
            <Progress value={percent} className="h-2" />
          </div>
        ) : (
          <Button type="button" size="sm" onClick={install}><Download size={14} className="mr-2" /> Install whisper.cpp</Button>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </AlertDescription>
    </Alert>
  );
}
