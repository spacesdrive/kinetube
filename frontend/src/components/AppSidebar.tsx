import { FileText, Settings } from 'lucide-react';

import { InstagramIcon, YouTubeIcon } from '@/components/icons/BrandIcons';
import InstagramAccountsSection from '@/components/sidebar/InstagramAccountsSection';
import ThemeToggleItem from '@/components/sidebar/ThemeToggleItem';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import type { ComponentType } from 'react';
import type { InstagramAccountsSectionProps } from '@/components/sidebar/InstagramAccountsSection';
import type { Page } from '@/lib/pages';

export interface AppSidebarProps {
  page: Page;
  onPageChange(page: Page): void;
  instagram: InstagramAccountsSectionProps;
}

interface NavItem {
  page: Page;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  iconColor: string;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'youtube', label: 'YouTube', Icon: YouTubeIcon, iconColor: 'text-red-500', activeColor: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { page: 'instagram', label: 'Instagram', Icon: InstagramIcon, iconColor: 'text-pink-500', activeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  { page: 'transcribe', label: 'Transcribe', Icon: FileText, iconColor: 'text-blue-500', activeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
];

function BrandHeader({ onPageChange }: Pick<AppSidebarProps, 'onPageChange'>) {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" tooltip="KineTube" onClick={() => onPageChange('youtube')}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
              <img src="/favicon.png" alt="" className="h-5 w-5 object-contain" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold tracking-tight">KineTube</span>
              <span className="truncate text-xs text-muted-foreground">Local downloader</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

export default function AppSidebar({ page, onPageChange, instagram }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <BrandHeader onPageChange={onPageChange} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Download</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ page: itemPage, label, Icon, iconColor, activeColor }) => (
                <SidebarMenuItem key={itemPage}>
                  <SidebarMenuButton tooltip={label} isActive={page === itemPage} onClick={() => onPageChange(itemPage)} className={cn('transition-all', page === itemPage && activeColor)}>
                    <Icon className={cn('h-4 w-4', page !== itemPage && iconColor)} />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {page === 'instagram' && <InstagramAccountsSection {...instagram} />}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ThemeToggleItem />
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" isActive={page === 'settings'} onClick={() => onPageChange('settings')} className={cn(page === 'settings' && 'bg-muted text-foreground')}>
              <Settings size={16} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
