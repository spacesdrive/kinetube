import { AlertCircle, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatSpeed } from '@/lib/format';

export interface UpdateDialogProps {
  version: string;
  onDismiss(): void;
}

type UpdatePhase = 'available' | 'downloading' | 'downloaded' | 'error';

const TITLES: Record<UpdatePhase, string> = {
  available: 'Update available',
  downloading: 'Downloading the update',
  downloaded: 'Update ready',
  error: "The update didn't download",
};

function descriptionFor(phase: UpdatePhase, version: string, errorMessage: string): string {
  if (phase === 'available') return `kinetube ${version} is available, with the latest fixes.`;
  if (phase === 'downloading') return 'Keep kinetube open until the download finishes.';
  if (phase === 'downloaded') return 'kinetube restarts to install it.';
  return `${errorMessage} Try again, or download the installer from the GitHub releases page.`;
}

function ActionLabel({ phase }: { phase: UpdatePhase }) {
  if (phase === 'downloading') return <><Spinner data-icon="inline-start" /> Downloading...</>;
  if (phase === 'downloaded') return <><RefreshCw data-icon="inline-start" /> Restart and install</>;
  if (phase === 'error') return <>Try again</>;
  return <><Download data-icon="inline-start" /> Update now</>;
}

export default function UpdateDialog({ version, onDismiss }: UpdateDialogProps) {
  const [phase, setPhase] = useState<UpdatePhase>('available');
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const canClose = phase !== 'downloading';

  useEffect(() => {
    return window.electronAPI?.onUpdateStatus((status) => {
      if (status.type === 'progress') {
        setPhase('downloading');
        setPercent(Math.round(status.percent));
        setSpeed(formatSpeed(status.bytesPerSecond));
      } else if (status.type === 'downloaded') {
        setPhase('downloaded');
        setPercent(100);
      } else if (status.type === 'error') {
        setPhase('error');
        setErrorMessage(status.message);
      }
    });
  }, []);

  function handleAction() {
    if (phase === 'downloaded') {
      void window.electronAPI?.installUpdate();
      return;
    }
    setPhase('downloading');
    setErrorMessage('');
    void window.electronAPI?.downloadUpdate();
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen && canClose) onDismiss(); }}>
      <DialogContent showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {TITLES[phase]}
            <StatusBadge className="font-mono">v{version}</StatusBadge>
          </DialogTitle>
          <DialogDescription>{descriptionFor(phase, version, errorMessage)}</DialogDescription>
        </DialogHeader>
        {phase === 'downloading' && (
          <div className="flex flex-col gap-1.5">
            <Progress value={percent} className="h-1.5" />
            <div className="flex justify-between text-xs text-ink-muted"><span>{percent}%</span>{speed && <span>{speed}</span>}</div>
          </div>
        )}
        {phase === 'downloaded' && <div className="flex items-center gap-2 text-sm text-ink-muted"><CheckCircle2 size={15} className="flex-shrink-0 text-success" /> Downloaded and ready to install.</div>}
        {phase === 'error' && <div className="flex items-center gap-2 text-sm text-ink-muted"><AlertCircle size={15} className="flex-shrink-0 text-error" /> The installed version keeps working in the meantime.</div>}
        <DialogFooter>
          {canClose && <Button type="button" variant="ghost" onClick={onDismiss}>Later</Button>}
          <Button type="button" onClick={handleAction} disabled={phase === 'downloading'}><ActionLabel phase={phase} /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
