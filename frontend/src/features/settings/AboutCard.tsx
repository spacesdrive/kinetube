import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SettingRow from './SettingRow';
import { APP_UPDATE_HINTS, useAppUpdateCheck } from './useAppUpdateCheck';
import { useYtdlpUpdate } from './useYtdlpUpdate';
import YtdlpVersionRow from './YtdlpVersionRow';

const TOOLS = ['yt-dlp', 'FFmpeg', 'instaloader', 'whisper.cpp'];

function AppVersionRow() {
  const { appVersion, state, check } = useAppUpdateCheck();
  if (!appVersion) return null;

  return (
    <>
      <SettingRow label="Version" hint={APP_UPDATE_HINTS[state]}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">v{appVersion}</Badge>
          <Button type="button" size="sm" variant="outline" onClick={() => void check()} disabled={state === 'checking'} className="gap-1.5">
            <RefreshCw size={13} className={state === 'checking' ? 'animate-spin' : ''} />
            {state === 'checking' ? 'Checking...' : 'Check for updates'}
          </Button>
        </div>
      </SettingRow>
      <Separator />
    </>
  );
}

export default function AboutCard() {
  const ytdlp = useYtdlpUpdate();

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <AppVersionRow />
        <YtdlpVersionRow ytdlp={ytdlp} />
        {ytdlp.version && <Separator />}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-semibold text-foreground">KineTube</span> downloads from YouTube and Instagram on this computer.</p>
          <p>
            Built on{' '}
            {TOOLS.map((tool) => <Badge key={tool} variant="secondary" className="mr-1 text-[11px]">{tool}</Badge>)}
          </p>
          <p className="mt-3 text-xs">Downloads and transcripts stay on this computer. KineTube has no account and sends nothing to a server of its own.</p>
        </div>
      </CardContent>
    </Card>
  );
}
