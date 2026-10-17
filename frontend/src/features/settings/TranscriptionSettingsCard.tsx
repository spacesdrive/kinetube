import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/languages';
import SettingRow from './SettingRow';
import SettingsSection from './SettingsSection';

import type { WhisperModelId } from '@shared/transcriptions.ts';
import type { TranscriptionPreferences } from '@/lib/settings';

export interface TranscriptionSettingsCardProps {
  preferences: TranscriptionPreferences;
  onChange(preferences: TranscriptionPreferences): void;
}

const MODEL_LABELS: Record<WhisperModelId, string> = {
  tiny: 'Tiny (~75 MB)',
  base: 'Base (~142 MB)',
  small: 'Small (~466 MB)',
  medium: 'Medium (~1.5 GB)',
  large: 'Large (~2.9 GB)',
};

const MODEL_IDS = Object.keys(MODEL_LABELS) as WhisperModelId[];

export default function TranscriptionSettingsCard({ preferences, onChange }: TranscriptionSettingsCardProps) {
  const languageLabel = TRANSCRIPTION_LANGUAGES.find((language) => language.value === preferences.defaultLanguage)?.label;

  return (
    <SettingsSection title="Transcription" description="Defaults for the Transcribe page and for transcripts after a download.">
        <SettingRow label="Default model" hint="Larger models are more accurate, but slower and bigger on disk.">
          <Select value={preferences.defaultModel} onValueChange={(defaultModel) => { if (defaultModel) onChange({ ...preferences, defaultModel }); }}>
            <SelectTrigger aria-label="Default model" className="w-44"><SelectValue>{MODEL_LABELS[preferences.defaultModel]}</SelectValue></SelectTrigger>
            <SelectContent>{MODEL_IDS.map((modelId) => <SelectItem key={modelId} value={modelId}>{MODEL_LABELS[modelId]}</SelectItem>)}</SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Default language" hint="Detecting it automatically works well for most recordings.">
          <Select value={preferences.defaultLanguage} onValueChange={(defaultLanguage) => { if (defaultLanguage) onChange({ ...preferences, defaultLanguage }); }}>
            <SelectTrigger aria-label="Default language" className="w-48"><SelectValue>{languageLabel}</SelectValue></SelectTrigger>
            <SelectContent>{TRANSCRIPTION_LANGUAGES.map((language) => <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>)}</SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>
  );
}
