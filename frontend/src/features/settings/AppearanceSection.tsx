import { useTheme } from 'next-themes';

import FilterChips from '@/components/patterns/FilterChips';
import { asThemeChoice } from '@/lib/commands';
import SettingRow from './SettingRow';
import SettingsSection from './SettingsSection';

import type { ThemeChoice } from '@/lib/commands';

const THEME_CHIPS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Match the system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// the theme applies at once and is remembered on its own, so it needs no Save
export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection title="Appearance">
      <SettingRow label="Theme" hint="Changes right away.">
        <FilterChips<ThemeChoice> label="Theme" chips={THEME_CHIPS} value={asThemeChoice(theme)} onChange={setTheme} />
      </SettingRow>
    </SettingsSection>
  );
}
