import { CheckCircle, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';
import AboutCard from './AboutCard';
import DownloadDefaultsCard from './DownloadDefaultsCard';
import TranscriptionSettingsCard from './TranscriptionSettingsCard';

import type { AppSettings } from '@/lib/settings';

export interface SettingsPageProps {
  onSave(settings: AppSettings): void;
}

// the "Saved" confirmation stays long enough to read, then the button goes back to "Save"
const SAVED_NOTICE_MS = 2_500;

export default function SettingsPage({ onSave }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!isSaved) return;
    const timer = setTimeout(() => setIsSaved(false), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [isSaved]);

  function change(next: AppSettings) {
    setSettings(next);
    setIsSaved(false);
  }

  function handleSave() {
    saveSettings(settings);
    setIsSaved(true);
    onSave(settings);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Saved on this computer only</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => change(DEFAULT_SETTINGS)} className="gap-1.5"><RotateCcw size={13} /> Reset</Button>
          <Button type="button" size="sm" onClick={handleSave} className="gap-1.5">
            {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>
      <div className="space-y-5">
        <TranscriptionSettingsCard preferences={settings.transcription} onChange={(transcription) => change({ ...settings, transcription })} />
        <DownloadDefaultsCard preferences={settings.downloads} onChange={(downloads) => change({ ...settings, downloads })} />
        <AboutCard />
      </div>
    </div>
  );
}
