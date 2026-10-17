import { Download } from 'lucide-react';
import { useEffect, useRef } from 'react';

import Notice from '@/components/patterns/Notice';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';

import type { useInstaloaderSetup } from './useInstaloaderSetup';

export interface InstaloaderSetupProps {
  setup: ReturnType<typeof useInstaloaderSetup>;
}

function InstallLog({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-ink"><Spinner className="size-4" /> Installing instaloader...</p>
      <ScrollArea className="h-36 w-full rounded-control bg-app p-3">
        <div className="space-y-0.5 font-mono text-xs text-ink-muted">
          {lines.length === 0 ? <span className="text-ink-faint">Starting pip...</span> : lines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

export default function InstaloaderSetup({ setup }: InstaloaderSetupProps) {
  const { status, logLines, failure, check, install } = setup;

  if (status === 'checking') return <p role="status" className="flex items-center gap-2 py-4 text-sm text-ink-muted"><Spinner className="size-4" /> Checking the setup...</p>;
  if (status === 'installing') return <InstallLog lines={logLines} />;
  if (status === 'missingPython') {
    return (
      <div className="space-y-4">
        <Notice tone="warning" title="Python isn't installed">
          Instagram login needs Python. Install it from <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="font-medium text-spin-text underline">python.org</a> with "Add to PATH" ticked, then check again.
        </Notice>
        <Button type="button" variant="outline" className="w-full" onClick={check}>Check again</Button>
      </div>
    );
  }
  if (status === 'needsInstall') {
    return (
      <div className="space-y-4">
        <Notice tone="accent" title="One-time setup">
          Python is installed. kinetube also needs the <code className="font-mono">instaloader</code> library, which it can install for you.
        </Notice>
        <Button type="button" className="w-full" onClick={install}><Download /> Install instaloader</Button>
      </div>
    );
  }
  if (status !== 'installFailed') return null;

  return (
    <div className="space-y-3">
      <Notice tone="error" title="instaloader isn't installed">{failure || 'Run "pip install instaloader" in a terminal, then check again.'}</Notice>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={install}>Try again</Button>
        <Button type="button" variant="outline" className="flex-1" onClick={check}>Check again</Button>
      </div>
    </div>
  );
}
