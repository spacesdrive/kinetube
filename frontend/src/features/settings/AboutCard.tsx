import { RefreshCw } from 'lucide-react';

import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import SettingRow from './SettingRow';
import SettingsSection from './SettingsSection';
import { APP_UPDATE_HINTS, useAppUpdateCheck } from './useAppUpdateCheck';
import { useYtdlpUpdate } from './useYtdlpUpdate';
import YtdlpVersionRow from './YtdlpVersionRow';

const TOOLS = ['yt-dlp', 'FFmpeg', 'instaloader', 'whisper.cpp'];

function AppVersionRow() {
  const { appVersion, state, check, canCheck } = useAppUpdateCheck();
  const hint = APP_UPDATE_HINTS[state] ?? (canCheck ? 'kinetube checks for updates when it starts.' : 'Update checks run in the installed app.');

  return (
    <SettingRow label="kinetube" hint={hint}>
      <div className="flex items-center gap-2">
        <StatusBadge className="font-mono">v{appVersion}</StatusBadge>
        {canCheck && (
          <Button type="button" size="sm" variant="outline" onClick={() => void check()} disabled={state === 'checking'}>
            <RefreshCw className={state === 'checking' ? 'animate-spin' : ''} />
            {state === 'checking' ? 'Checking...' : 'Check for updates'}
          </Button>
        )}
      </div>
    </SettingRow>
  );
}

export default function AboutCard() {
  const ytdlp = useYtdlpUpdate();

  return (
    <SettingsSection title="About" description="Downloads and transcripts stay on this computer. kinetube has no account and sends nothing to a server of its own.">
      <AppVersionRow />
      <YtdlpVersionRow ytdlp={ytdlp} />
      <SettingRow label="Built on" hint="Open-source tools, downloaded on first run.">
        <div className="flex flex-wrap justify-end gap-1.5">{TOOLS.map((tool) => <StatusBadge key={tool}>{tool}</StatusBadge>)}</div>
      </SettingRow>
    </SettingsSection>
  );
}
