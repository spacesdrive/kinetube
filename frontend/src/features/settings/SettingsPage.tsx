import { RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import PageHeader from '@/components/patterns/PageHeader';
import { Button } from '@/components/ui/button';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';
import AboutCard from './AboutCard';
import AppearanceSection from './AppearanceSection';
import DownloadDefaultsCard from './DownloadDefaultsCard';
import TranscriptionSettingsCard from './TranscriptionSettingsCard';

import type { AppSettings } from '@/lib/settings';

export interface SettingsPageProps {
  onSave(settings: AppSettings): void;
}

export default function SettingsPage({ onSave }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isDirty, setIsDirty] = useState(false);

  function change(next: AppSettings) {
    setSettings(next);
    setIsDirty(true);
  }

  function handleSave() {
    saveSettings(settings);
    setIsDirty(false);
    onSave(settings);
    toast.success('Settings saved', { description: 'New downloads and transcriptions use them.' });
  }

  return (
    <div className="mx-auto max-w-[var(--content-narrow)] space-y-8">
      <PageHeader
        title="Settings"
        description="Saved on this computer only."
        actions={(
          <>
            <Button type="button" variant="ghost" onClick={() => change(DEFAULT_SETTINGS)}><RotateCcw /> Reset</Button>
            <Button type="button" variant={isDirty ? 'default' : 'secondary'} disabled={!isDirty} onClick={handleSave}><Save /> {isDirty ? 'Save' : 'Saved'}</Button>
          </>
        )}
      />
      <AppearanceSection />
      <TranscriptionSettingsCard preferences={settings.transcription} onChange={(transcription) => change({ ...settings, transcription })} />
      <DownloadDefaultsCard preferences={settings.downloads} onChange={(downloads) => change({ ...settings, downloads })} />
      <AboutCard />
    </div>
  );
}
