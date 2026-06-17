import { ChevronsUpDown, LogOut, Plus, Settings, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarRail, SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Brand SVG icons (inline — preserve original colours) ─────────────────────
const YT_ICON = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn('shrink-0', className)}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const IG_ICON = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn('shrink-0', className)}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TX_ICON = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('shrink-0', className)}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: 'youtube',
    label: 'YouTube',
    Icon: YT_ICON,
    iconColor: 'text-red-500',
    activeColor: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    Icon: IG_ICON,
    iconColor: 'text-pink-500',
    activeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    id: 'transcribe',
    label: 'Transcribe',
    Icon: TX_ICON,
    iconColor: 'text-blue-500',
    activeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
];

// ── Theme toggle in sidebar footer ────────────────────────────────────────────
function ThemeToggleItem() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={`Theme: ${label}`} onClick={() => setTheme(next)}>
        <Sun className="scale-100 dark:scale-0 transition-all" size={16} />
        <Moon className="absolute scale-0 dark:scale-100 transition-all" size={16} />
        <span>Theme: {label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ── Instagram accounts section ────────────────────────────────────────────────
function IgAccountsSection({ accounts, activeAccount, onSelect, onRemove, onAdd }) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  if (collapsed) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-1">
        <span>Instagram Accounts</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus size={12} />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {accounts.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-xs text-muted-foreground/60 italic"
                onClick={onAdd}
              >
                <Plus size={13} />
                <span>Add account</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <>
              {accounts.map((a) => (
                <SidebarMenuItem key={a.username}>
                  <SidebarMenuButton
                    isActive={activeAccount === a.username}
                    onClick={() => onSelect(a.username)}
                    className="group/acct text-xs"
                  >
                    <IG_ICON className="w-3 h-3 text-pink-500" />
                    <span className="flex-1 truncate">@{a.username}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemove(a.username); }}
                      className="opacity-0 group-hover/acct:opacity-100 transition-opacity text-muted-foreground/50 hover:text-red-400"
                    >
                      <X size={11} />
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton className="text-xs text-muted-foreground/70" onClick={onAdd}>
                  <Plus size={13} />
                  <span>Add account</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AppSidebar({
  platform,
  onPlatformChange,
  igAccounts = [],
  activeIgAccount,
  onIgAccountSelect,
  onIgAccountRemove,
  onIgAddAccount,
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Header: Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer"
              onClick={() => onPlatformChange('youtube')}
              tooltip="KineTube"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                <img src="/favicon.png" alt="KineTube" className="w-5 h-5 object-contain" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight">KineTube</span>
                <span className="truncate text-xs text-muted-foreground">Local Downloader</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content: Main nav ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Download</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ id, label, Icon, iconColor, activeColor }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={platform === id}
                    onClick={() => onPlatformChange(id)}
                    className={cn(
                      'transition-all',
                      platform === id ? activeColor : ''
                    )}
                  >
                    <Icon className={cn('w-4 h-4', platform === id ? '' : iconColor)} />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Instagram accounts — shown when on Instagram tab */}
        {platform === 'instagram' && (
          <IgAccountsSection
            accounts={igAccounts}
            activeAccount={activeIgAccount}
            onSelect={onIgAccountSelect}
            onRemove={onIgAccountRemove}
            onAdd={onIgAddAccount}
          />
        )}
      </SidebarContent>

      {/* ── Footer: Settings + Theme ── */}
      <SidebarFooter>
        <SidebarMenu>
          <ThemeToggleItem />
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              isActive={platform === 'settings'}
              onClick={() => onPlatformChange('settings')}
              className={platform === 'settings' ? 'bg-muted text-foreground' : ''}
            >
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
