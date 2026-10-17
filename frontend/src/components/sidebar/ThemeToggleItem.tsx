import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

type ThemeName = 'light' | 'dark' | 'system';

// each press moves to the next theme: light, then system, then dark, then light again
const NEXT_THEME: Record<ThemeName, ThemeName> = { light: 'system', system: 'dark', dark: 'light' };
const THEME_LABELS: Record<ThemeName, string> = { light: 'Light', system: 'System', dark: 'Dark' };

function asThemeName(theme: string | undefined): ThemeName {
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

export default function ThemeToggleItem() {
  const { theme, setTheme } = useTheme();
  const current = asThemeName(theme);
  const label = `Theme: ${THEME_LABELS[current]}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={label} onClick={() => setTheme(NEXT_THEME[current])}>
        <Sun className="scale-100 transition-all dark:scale-0" size={16} />
        <Moon className="absolute scale-0 transition-all dark:scale-100" size={16} />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
