import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';

import { Logo } from '@/components/brand';
import { GitHubIcon } from '@/components/marks';
import { Pill } from '@/components/Pill';
import { ScrollManager } from '@/components/ScrollManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/cn';
import { DOWNLOAD_URL, GITHUB_URL } from '@/lib/links';

import { DocsSidebar } from './DocsSidebar';
import { DOC_TABS, docEntry, firstPathOf, slugFromPath } from './nav';
import type { DocEntry, DocTab } from './nav';
import { Search } from './Search';

function TabRow({ tab }: { tab: DocTab }) {
  return (
    <nav aria-label="Docs sections" className="mx-auto hidden h-12 max-w-[1440px] items-end gap-6 px-4 md:flex md:px-8">
      {DOC_TABS.map((item) => (
        <Link key={item.id} to={firstPathOf(item)} aria-current={item.id === tab.id ? 'true' : undefined} className={cn('border-b-2 pb-3 text-[15px] font-medium transition-colors', item.id === tab.id ? 'border-spin text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Drawer({ tab, entry, onClose }: { tab: DocTab; entry: DocEntry | undefined; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Docs menu">
      <button type="button" aria-label="Close the docs menu" className="absolute inset-0 bg-panel-deep/60" onClick={onClose} />
      <div className="relative flex h-full w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto bg-app px-3 py-4 shadow-popover">
        <div className="flex items-center justify-between px-3">
          <Logo size={24} />
          <button type="button" onClick={onClose} aria-label="Close the docs menu" className="flex size-9 items-center justify-center rounded-control text-ink hover:bg-surface-hover"><X className="size-5" /></button>
        </div>
        <Search className="px-3" />
        <nav aria-label="Docs sections" className="flex flex-wrap gap-2 px-3">
          {DOC_TABS.map((item) => (
            <Link key={item.id} to={firstPathOf(item)} onClick={onClose} className={cn('rounded-full px-3 py-1 text-sm', item.id === tab.id ? 'bg-spin-soft font-medium text-spin-text' : 'bg-surface text-ink-muted')}>{item.label}</Link>
          ))}
        </nav>
        <DocsSidebar tab={tab} current={entry} onNavigate={onClose} />
      </div>
    </div>
  );
}

// the docs frame from the Activepieces docs: a top bar with search, a row of tabs, the sidebar, the page and its outline
export default function DocsLayout() {
  const { pathname } = useLocation();
  const entry = docEntry(slugFromPath(pathname));
  const tab = entry?.tab ?? DOC_TABS[0];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // the phone drawer closes on Escape like any dialog
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setIsDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  if (!tab) return null;
  return (
    <div className="min-h-svh bg-app">
      <ScrollManager />
      <a href="#doc-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-surface-elevated focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line bg-app/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-8">
          <Link to="/docs" aria-label="kinetube Docs home" className="flex shrink-0 items-center gap-2">
            <Logo size={24} />
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">Docs</span>
          </Link>
          <Search className="mx-auto hidden w-full max-w-md md:block" />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink lg:flex"><GitHubIcon className="size-4" />GitHub</a>
            <Link to="/" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink lg:block">kinetube home</Link>
            <span className="ml-1 hidden sm:inline-flex">
              <Pill href={DOWNLOAD_URL} size="sm" className="pr-3">Download<ArrowRight className="size-4" /></Pill>
            </span>
            <ThemeToggle />
          </div>
        </div>
        <TabRow tab={tab} />
        <div className="flex h-12 items-center gap-3 border-t border-line px-4 md:hidden">
          <button type="button" onClick={() => setIsDrawerOpen(true)} aria-label="Open the docs menu" aria-expanded={isDrawerOpen} className="flex size-9 items-center justify-center rounded-control text-ink hover:bg-surface-hover"><Menu className="size-5" /></button>
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm">
            <span className="text-ink-muted">{entry?.group.label ?? tab.label}</span>
            <ChevronRight className="size-3.5 shrink-0 text-ink-muted" />
            <span className="truncate font-medium text-ink">{entry?.title ?? 'Docs'}</span>
          </p>
        </div>
      </header>

      {isDrawerOpen && <Drawer tab={tab} entry={entry} onClose={() => setIsDrawerOpen(false)} />}

      <div className="mx-auto flex max-w-[1440px] gap-10 px-4 md:px-8">
        <aside className="sticky top-28 hidden h-[calc(100svh-7rem)] w-64 shrink-0 overflow-y-auto py-8 pr-2 md:block">
          <DocsSidebar tab={tab} current={entry} />
        </aside>
        <main className="flex min-w-0 flex-1 gap-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
