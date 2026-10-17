import { AudioLines, Layers, Settings } from 'lucide-react';

import { InstagramIcon, YouTubeIcon } from '@/components/icons/BrandIcons';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar';
import { PAGE_LABELS } from '@/lib/pages';
import { cn } from '@/lib/utils';
import BrandLockup from './BrandLockup';
import InstagramAccountsSection from './InstagramAccountsSection';
import ThemeSwitcher from './ThemeSwitcher';

import type { ComponentType } from 'react';
import type { Page } from '@/lib/pages';
import type { InstagramAccountsSectionProps } from './InstagramAccountsSection';

export interface AppSidebarProps {
  page: Page;
  onPageChange(page: Page): void;
  instagram: InstagramAccountsSectionProps;
}

interface NavItem {
  page: Page;
  Icon: ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Download', items: [{ page: 'youtube', Icon: YouTubeIcon }, { page: 'instagram', Icon: InstagramIcon }, { page: 'batch', Icon: Layers }] },
  { label: 'Tools', items: [{ page: 'transcribe', Icon: AudioLines }] },
];

function NavButton({ item, page, onPageChange }: { item: NavItem; page: Page; onPageChange(page: Page): void }) {
  const isActive = page === item.page;
  const label = PAGE_LABELS[item.page];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={label} isActive={isActive} aria-current={isActive ? 'page' : undefined} onClick={() => onPageChange(item.page)}>
        <item.Icon className={cn('size-4', isActive && 'text-spin-text')} />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppSidebar({ page, onPageChange, instagram }: AppSidebarProps) {
  const { state } = useSidebar();
  const showsAccounts = page === 'instagram' || page === 'batch';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-[var(--topbar-height)] justify-center px-4 group-data-[collapsible=icon]:px-2">
        <button type="button" aria-label="kinetube, go to YouTube" onClick={() => onPageChange('youtube')} className="flex w-fit items-center rounded-row">
          <BrandLockup isCompact={state === 'collapsed'} />
        </button>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-1.5 pt-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => <NavButton key={item.page} item={item} page={page} onPageChange={onPageChange} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {showsAccounts && <InstagramAccountsSection {...instagram} />}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu className="gap-0.5">
          <ThemeSwitcher />
          <NavButton item={{ page: 'settings', Icon: Settings }} page={page} onPageChange={onPageChange} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
