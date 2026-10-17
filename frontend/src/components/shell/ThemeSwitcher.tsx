import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { asThemeChoice } from '@/lib/commands';

import type { LucideIcon } from 'lucide-react';
import type { ThemeChoice } from '@/lib/commands';

const THEMES: { value: ThemeChoice; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match the system', Icon: Monitor },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((option) => option.value === asThemeChoice(theme)) ?? THEMES[2];
  const CurrentIcon = current?.Icon ?? Monitor;

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton tooltip="Theme" />}>
          <CurrentIcon />
          <span>Theme</span>
          <span className="ml-auto text-xs text-ink-faint group-data-[collapsible=icon]:hidden">{current?.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuRadioGroup value={asThemeChoice(theme)} onValueChange={(value) => setTheme(asThemeChoice(String(value)))}>
            {/* the label belongs inside the group: Base UI throws otherwise */}
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {THEMES.map(({ value, label, Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
