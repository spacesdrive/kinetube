import { ArrowLeft, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PAGE_LABELS } from '@/lib/pages';

import type { Page } from '@/lib/pages';

export interface AppHeaderProps {
  page: Page;
  hasResult: boolean;
  isBatchMode: boolean;
  canUseBatch: boolean;
  onNewSearch(): void;
  onToggleBatch(): void;
}

export default function AppHeader({ page, hasResult, isBatchMode, canUseBatch, onNewSearch, onToggleBatch }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <span className="text-sm font-semibold text-foreground">{PAGE_LABELS[page]}</span>
      <div className="flex-1" />
      {hasResult && (
        <Button type="button" variant="ghost" size="sm" onClick={onNewSearch} className="gap-1.5 text-muted-foreground">
          <ArrowLeft size={14} /> New search
        </Button>
      )}
      {canUseBatch && !hasResult && (
        <Button type="button" variant={isBatchMode ? 'secondary' : 'ghost'} size="sm" onClick={onToggleBatch} className="gap-1.5 text-muted-foreground">
          <Layers size={14} />
          {isBatchMode ? 'Leave batch mode' : 'Batch'}
        </Button>
      )}
    </header>
  );
}
