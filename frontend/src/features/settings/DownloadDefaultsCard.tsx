import { Folder } from 'lucide-react';
import { useState } from 'react';

import QualitySelect from '@/components/QualitySelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { pickFolder } from '@/lib/folderPicker';
import { SHORT_QUALITY_LIST } from '@/lib/qualities';
import SettingRow from './SettingRow';
import SettingsSection from './SettingsSection';

import type { DownloadPreferences } from '@/lib/settings';

export interface DownloadDefaultsCardProps {
  preferences: DownloadPreferences;
  onChange(preferences: DownloadPreferences): void;
}

export default function DownloadDefaultsCard({ preferences, onChange }: DownloadDefaultsCardProps) {
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [folderProblem, setFolderProblem] = useState('');
  const update = (changes: Partial<DownloadPreferences>): void => onChange({ ...preferences, ...changes });

  async function handleBrowse() {
    setIsBrowsing(true);
    setFolderProblem('');
    try {
      const chosen = await pickFolder();
      if (chosen) update({ outputDir: chosen });
    } catch (error) {
      setFolderProblem(`Couldn't open the folder picker. ${(error as Error).message}`);
    } finally {
      setIsBrowsing(false);
    }
  }

  return (
    <SettingsSection title="Downloads" description="Used for every new download. The Download options panel can change them for one session.">
        <SettingRow label="Download folder" hint="Leave empty to use the default downloads folder." htmlFor="settings-output-dir">
          <div className="flex items-center gap-2">
            <Input id="settings-output-dir" value={preferences.outputDir} onChange={(event) => update({ outputDir: event.target.value })} placeholder="The default downloads folder" className="w-56 font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" aria-label="Browse for a folder" onClick={handleBrowse} disabled={isBrowsing} className="flex-shrink-0"><Folder size={14} /></Button>
          </div>
          {folderProblem && <p role="alert" className="mt-1.5 max-w-64 text-xs text-warning">{folderProblem}</p>}
        </SettingRow>
        <SettingRow label="Default quality" hint="Where a page offers a quality, it starts on this one.">
          <QualitySelect value={preferences.defaultQuality} options={SHORT_QUALITY_LIST} onChange={(defaultQuality) => update({ defaultQuality })} className="w-40" />
        </SettingRow>
        <SettingRow label="Number the files" hint="Starts each file name with a sequence number." htmlFor="settings-numbering">
          <Switch id="settings-numbering" checked={preferences.useNumbering} onCheckedChange={(useNumbering) => update({ useNumbering })} />
        </SettingRow>
        <SettingRow label="File name prefix" htmlFor="settings-prefix">
          <Input id="settings-prefix" value={preferences.prefix} onChange={(event) => update({ prefix: event.target.value })} placeholder="For example 2024-" className="w-40" />
        </SettingRow>
        <SettingRow label="File name suffix" htmlFor="settings-suffix">
          <Input id="settings-suffix" value={preferences.suffix} onChange={(event) => update({ suffix: event.target.value })} placeholder="For example _HD" className="w-40" />
        </SettingRow>
        <SettingRow label="Custom file name template" hint="yt-dlp fields such as %(title)s, %(id)s and %(uploader)s." htmlFor="settings-custom-name">
          <div className="flex items-center gap-2">
            <Switch id="settings-custom-name" checked={preferences.useCustomFilename} onCheckedChange={(useCustomFilename) => update({ useCustomFilename })} />
            {preferences.useCustomFilename && (
              <Input aria-label="File name template" value={preferences.customFilenameTemplate} onChange={(event) => update({ customFilenameTemplate: event.target.value })} placeholder="%(title)s" className="w-44 font-mono text-xs" />
            )}
          </div>
        </SettingRow>
      </SettingsSection>
  );
}
