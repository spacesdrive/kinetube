import { ChevronRight, Search } from 'lucide-react';

import Kbd from '@/components/patterns/Kbd';
import { SidebarTrigger } from '@/components/ui/sidebar';

import type { ReactNode } from 'react';

export interface TopBarProps {
  title: string;
  context?: string | null;
  actions?: ReactNode;
  onOpenCommands(): void;
}

const SHORTCUT_MODIFIER = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

export default function TopBar({ title, context, actions, onOpenCommands }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-divider bg-app/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-app/75">
      <SidebarTrigger className="-ml-1 text-ink-muted" />
      <nav aria-label="Where you are" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className={context ? 'text-ink-muted' : 'font-medium text-ink'}>{title}</span>
        {context && (
          <>
            <ChevronRight size={14} aria-hidden="true" className="flex-shrink-0 text-ink-faint" />
            <span className="truncate font-medium text-ink">{context}</span>
          </>
        )}
      </nav>
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onOpenCommands}
          className="hidden h-8 w-full max-w-[280px] items-center gap-2 rounded-control border border-line-strong px-2.5 text-[13px] text-ink-faint transition-quiet hover:bg-surface-hover hover:text-ink-muted md:flex"
        >
          <Search size={14} aria-hidden="true" />
          <span className="flex-1 text-left">Search or paste a link</span>
          <span className="flex gap-1"><Kbd>{SHORTCUT_MODIFIER}</Kbd><Kbd>K</Kbd></span>
        </button>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
