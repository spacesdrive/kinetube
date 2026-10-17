import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { InstagramIcon } from '@/components/icons/BrandIcons';
import ConfirmDialog from '@/components/patterns/ConfirmDialog';
import { SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

import type { InstagramAccount } from '@shared/instagram.ts';

export interface InstagramAccountsSectionProps {
  accounts: InstagramAccount[];
  activeAccount: string | null;
  onSelect(username: string): void;
  onRemove(username: string): void;
  onAdd(): void;
}

export default function InstagramAccountsSection({ accounts, activeAccount, onSelect, onRemove, onAdd }: InstagramAccountsSectionProps) {
  const { state } = useSidebar();
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  if (state === 'collapsed') return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Instagram accounts</SidebarGroupLabel>
      <SidebarGroupAction aria-label="Log in to an Instagram account" title="Log in to an Instagram account" onClick={onAdd}>
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {accounts.length === 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onAdd} className="text-ink-faint">
                <Plus />
                <span>Log in for profiles</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {accounts.map(({ username }) => (
            <SidebarMenuItem key={username}>
              <SidebarMenuButton isActive={activeAccount === username} onClick={() => onSelect(username)}>
                <InstagramIcon className="size-4" />
                <span>@{username}</span>
              </SidebarMenuButton>
              <SidebarMenuAction showOnHover aria-label={`Remove @${username}`} title={`Remove @${username}`} onClick={() => setPendingRemoval(username)}>
                <Trash2 />
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>

      {pendingRemoval && (
        <ConfirmDialog
          title={`Remove @${pendingRemoval}?`}
          description="This deletes the saved login from this computer. You can log in again at any time."
          confirmLabel="Hold to remove"
          isDestructive
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => {
            onRemove(pendingRemoval);
            setPendingRemoval(null);
          }}
        />
      )}
    </SidebarGroup>
  );
}
