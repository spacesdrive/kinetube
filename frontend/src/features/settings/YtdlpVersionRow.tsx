import { Download, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import SettingRow from './SettingRow';

import type { YtdlpUpdate, YtdlpUpdateState } from './useYtdlpUpdate';

export interface YtdlpVersionRowProps {
  ytdlp: YtdlpUpdate;
}

function hintFor(state: YtdlpUpdateState, latestVersion: string | null, error: string): string {
  const hints: Record<YtdlpUpdateState, string> = {
    idle: 'YouTube downloads depend on yt-dlp keeping up with changes on the site.',
    checking: 'Checking GitHub for a newer release...',
    upToDate: 'This is the newest yt-dlp release.',
    available: `yt-dlp ${latestVersion ?? ''} is available.`,
    updating: 'Downloading the new release...',
    updated: 'yt-dlp updated',
    error,
  };
  return hints[state];
}

function Action({ ytdlp }: YtdlpVersionRowProps) {
  const { state, latestVersion, percent, check, update } = ytdlp;

  if (state === 'available') {
    return <Button type="button" size="sm" onClick={update} className="gap-1.5 bg-amber-500 hover:bg-amber-600"><Download size={13} /> Update to {latestVersion}</Button>;
  }
  if (state === 'updating') {
    return <Button type="button" size="sm" variant="outline" disabled className="gap-1.5"><RefreshCw size={13} className="animate-spin" /> Updating {percent > 0 ? `${Math.round(percent)}%` : ''}</Button>;
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void check()} disabled={state === 'checking'} className="gap-1.5">
      <RefreshCw size={13} className={state === 'checking' ? 'animate-spin' : ''} />
      {state === 'checking' ? 'Checking...' : 'Check for updates'}
    </Button>
  );
}

export default function YtdlpVersionRow({ ytdlp }: YtdlpVersionRowProps) {
  if (!ytdlp.version) return null;

  return (
    <>
      <SettingRow label="yt-dlp" hint={hintFor(ytdlp.state, ytdlp.latestVersion, ytdlp.error)}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">{ytdlp.version}</Badge>
          <Action ytdlp={ytdlp} />
        </div>
      </SettingRow>
      {ytdlp.state === 'updating' && <Progress value={ytdlp.percent} className="h-1.5" />}
    </>
  );
}
