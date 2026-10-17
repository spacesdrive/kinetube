import { AlertTriangle, Settings } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { Tool } from '@shared/tools.ts';

export interface YtdlpAlertProps {
  ytdlp: Tool | null;
  onOpenSettings(): void;
}

// shown when the installed yt-dlp is older than the release this KineTube was tested with
export default function YtdlpAlert({ ytdlp, onOpenSettings }: YtdlpAlertProps) {
  if (!ytdlp?.isInstalled || !ytdlp.needsUpdate) return null;

  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-500">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>yt-dlp needs an update</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          The installed version <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">{ytdlp.version}</code> is older than{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">{ytdlp.requiredVersion}</code>, so some downloads may fail.
        </p>
        <Button type="button" size="sm" onClick={onOpenSettings} className="bg-amber-500 hover:bg-amber-600">
          <Settings className="mr-1.5 h-3.5 w-3.5" />
          Update it in Settings
        </Button>
      </AlertDescription>
    </Alert>
  );
}
