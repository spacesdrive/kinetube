import { useEffect, useRef } from 'react';

import AppSidebar from '@/components/shell/AppSidebar';
import TopBar from '@/components/shell/TopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PAGE_LABELS } from '@/lib/pages';
import { cn } from '@/lib/utils';
import { SHELL_HEIGHT, SHELL_WIDTH } from './frame';

import type { ReactNode } from 'react';
import type { Page } from '@/lib/pages';

export interface DemoShellProps {
  page: Page;
  context?: string | null;
  isDark?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

function ignore(): void {}

const NO_ACCOUNTS = { accounts: [], activeAccount: null, onSelect: ignore, onRemove: ignore, onAdd: ignore };

// the real sidebar and top bar, held inside a fixed frame because a Flute surface is not the viewport
export default function DemoShell({ page, context = null, isDark = false, actions, children }: DemoShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // a page tilted in 3D never scrolls lazy images into view, so they load at once
  useEffect(() => {
    rootRef.current?.querySelectorAll('img[loading="lazy"]').forEach((image) => { (image as HTMLImageElement).loading = 'eager'; });
  });

  return (
    <div ref={rootRef} className={cn(isDark && 'dark', 'bg-app text-ink')} style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <SidebarProvider className="relative h-full min-h-0 overflow-hidden [&_[data-slot=sidebar-container]]:absolute [&_[data-slot=sidebar-container]]:h-full">
        <AppSidebar page={page} onPageChange={ignore} instagram={NO_ACCOUNTS} />
        <SidebarInset className="min-w-0 overflow-hidden">
          <TopBar title={PAGE_LABELS[page]} context={context} actions={actions} onOpenCommands={ignore} />
          <div className="flex-1 overflow-hidden">
            <div className="mx-auto w-full max-w-[var(--content-max)] px-5 pt-8 pb-20 md:px-10">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
