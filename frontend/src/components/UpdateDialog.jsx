import { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export default function UpdateDialog({ version, onDismiss }) {
  const [phase, setPhase]       = useState('available');
  const [percent, setPercent]   = useState(0);
  const [speed, setSpeed]       = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canClose = phase !== 'downloading';

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    return window.electronAPI.onUpdateStatus((data) => {
      switch (data.type) {
        case 'progress':
          setPhase('downloading');
          setPercent(Math.round(data.percent ?? 0));
          if (data.speed) setSpeed(`${(data.speed / 1_048_576).toFixed(1)} MB/s`);
          break;
        case 'downloaded':
          setPhase('downloaded');
          setPercent(100);
          break;
        case 'error':
          setPhase('error');
          setErrorMsg(data.message || 'Something went wrong. Please try again later.');
          break;
      }
    });
  }, []);

  const handleAction = () => {
    if (phase === 'downloaded') {
      window.electronAPI?.installUpdate();
    } else if (phase === 'error') {
      setPhase('available');
      setErrorMsg('');
    } else {
      setPhase('downloading');
      window.electronAPI?.downloadUpdate();
    }
  };

  const title =
    phase === 'downloaded' ? 'Update Ready'
    : phase === 'downloading' ? 'Downloading Update'
    : phase === 'error' ? 'Update Failed'
    : 'Update Available';

  const description =
    phase === 'available'   ? `KineTube v${version} is available. Update now to get the latest fixes and improvements.`
    : phase === 'downloading' ? 'Please wait while the update downloads. Do not close the app.'
    : phase === 'downloaded'  ? 'The update is ready to install. The app will restart to apply it.'
    : errorMsg || 'Update failed. Please try again or download manually from GitHub.';

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open && canClose) onDismiss(); }}
    >
      <DialogContent showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary" className="font-mono text-xs">v{version}</Badge>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {phase === 'downloading' && (
          <div className="flex flex-col gap-1.5">
            <Progress value={percent} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percent}%</span>
              {speed && <span>{speed}</span>}
            </div>
          </div>
        )}

        {phase === 'downloaded' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
            Download complete. Ready to restart.
          </div>
        )}

        {phase === 'error' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle size={15} className="text-destructive flex-shrink-0" />
            You can also download the latest version directly from the GitHub releases page.
          </div>
        )}

        <DialogFooter>
          {canClose && (
            <Button variant="ghost" onClick={onDismiss}>
              Later
            </Button>
          )}
          <Button onClick={handleAction} disabled={phase === 'downloading'}>
            {phase === 'downloading' ? (
              <>
                <Spinner data-icon="inline-start" />
                Downloading…
              </>
            ) : phase === 'downloaded' ? (
              <>
                <RefreshCw data-icon="inline-start" />
                Restart & Install
              </>
            ) : phase === 'error' ? (
              'Retry'
            ) : (
              <>
                <Download data-icon="inline-start" />
                Update Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
