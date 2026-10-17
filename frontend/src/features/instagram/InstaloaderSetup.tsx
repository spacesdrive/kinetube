import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { useInstaloaderSetup } from './useInstaloaderSetup';

export interface InstaloaderSetupProps {
  setup: ReturnType<typeof useInstaloaderSetup>;
}

const GRADIENT_BUTTON = 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';

function InstallLog({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Loader2 size={16} className="animate-spin text-purple-500" /> Installing instaloader...</div>
      <ScrollArea className="h-36 w-full rounded-xl bg-gray-900 p-3">
        <div className="space-y-0.5 font-mono text-xs text-green-400">
          {lines.length === 0 ? <span className="text-gray-500">Starting pip...</span> : lines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

export default function InstaloaderSetup({ setup }: InstaloaderSetupProps) {
  const { status, logLines, failure, check, install } = setup;

  if (status === 'checking') {
    return <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground"><Loader2 size={22} className="animate-spin text-purple-500" /><span className="text-sm">Checking the setup...</span></div>;
  }
  if (status === 'installing') return <InstallLog lines={logLines} />;
  if (status === 'missingPython') {
    return (
      <div className="space-y-4">
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">
            <p className="mb-1 font-semibold">Python isn't installed</p>
            Instagram login needs Python. Install it from{' '}
            <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="font-medium underline">python.org</a>{' '}
            with "Add to PATH" ticked, then check again.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" className="w-full" onClick={check}>Check again</Button>
      </div>
    );
  }
  if (status === 'needsInstall') {
    return (
      <div className="space-y-4">
        <Alert variant="default" className="border-purple-200 bg-purple-50">
          <AlertDescription className="text-xs text-purple-700">
            <p className="mb-1 font-semibold">One-time setup</p>
            Python is installed. KineTube also needs the <code className="rounded bg-purple-100 px-1">instaloader</code> library, which it can install for you.
          </AlertDescription>
        </Alert>
        <Button type="button" className={`w-full ${GRADIENT_BUTTON}`} onClick={install}><Download size={14} className="mr-2" /> Install instaloader</Button>
      </div>
    );
  }
  if (status !== 'installFailed') return null;

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <p className="mb-1 font-semibold">instaloader isn't installed</p>
          {failure || 'Run "pip install instaloader" in a terminal, then check again.'}
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button type="button" className={`flex-1 ${GRADIENT_BUTTON}`} onClick={install}>Try again</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={check}>Check again</Button>
      </div>
    </div>
  );
}
