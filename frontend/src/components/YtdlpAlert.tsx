import { Settings } from 'lucide-react';

import Notice from '@/components/patterns/Notice';
import { Button } from '@/components/ui/button';

import type { Tool } from '@shared/tools.ts';

export interface YtdlpAlertProps {
  ytdlp: Tool | null;
  onOpenSettings(): void;
}

// shown when the installed yt-dlp is older than the release this kinetube was tested with
export default function YtdlpAlert({ ytdlp, onOpenSettings }: YtdlpAlertProps) {
  if (!ytdlp?.isInstalled || !ytdlp.needsUpdate) return null;

  return (
    <Notice
      tone="warning"
      title="yt-dlp needs an update"
      action={<Button type="button" size="sm" variant="outline" onClick={onOpenSettings}><Settings /> Update in Settings</Button>}
    >
      The installed version <code className="font-mono text-xs">{ytdlp.version}</code> is older than <code className="font-mono text-xs">{ytdlp.requiredVersion}</code>, so some downloads may fail.
    </Notice>
  );
}
