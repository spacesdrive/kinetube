import { Plus, X } from 'lucide-react';

import { InstagramIcon } from '@/components/icons/BrandIcons';
import { Button } from '@/components/ui/button';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

import type { InstagramAccount } from '@shared/instagram.ts';

export interface InstagramAccountsSectionProps {
  accounts: InstagramAccount[];
  activeAccount: string | null;
  onSelect(username: string): void;
  onRemove(username: string): void;
  onAdd(): void;
}

function AddAccountItem({ onAdd }: { onAdd(): void }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="text-xs text-muted-foreground/70" onClick={onAdd}>
        <Plus size={13} />
        <span>Add account</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function InstagramAccountsSection({ accounts, activeAccount, onSelect, onRemove, onAdd }: InstagramAccountsSectionProps) {
  const { state } = useSidebar();
  if (state === 'collapsed') return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-1">
        <span>Instagram accounts</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Add an Instagram account" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onAdd}>
          <Plus size={12} />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {accounts.map(({ username }) => (
            <SidebarMenuItem key={username}>
              <SidebarMenuButton isActive={activeAccount === username} onClick={() => onSelect(username)} className="group/account text-xs">
                <InstagramIcon className="h-3 w-3 text-pink-500" />
                <span className="flex-1 truncate">@{username}</span>
              </SidebarMenuButton>
              <button
                type="button"
                aria-label={`Remove @${username}`}
                onClick={() => onRemove(username)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-400 group-hover/menu-item:opacity-100"
              >
                <X size={11} />
              </button>
            </SidebarMenuItem>
          ))}
          <AddAccountItem onAdd={onAdd} />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
