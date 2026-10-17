import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { looksLikeLink } from '@/lib/urlCleaners';

import type { CommandAction } from '@/lib/commands';
import type { Page } from '@/lib/pages';

export interface AppCommandTargets {
  changePage(page: Page): void;
  openLink(url: string): void;
}

// the command palette's open state, its Ctrl or Cmd and K shortcut, and what each command does
export function useAppCommands({ changePage, openLink }: AppCommandTargets) {
  const [isOpen, setIsOpen] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pasteAndFetch = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (looksLikeLink(text)) openLink(text);
      else toast.error('The clipboard has no YouTube or Instagram link.', { description: 'Copy a link first, then try again.' });
    } catch {
      toast.error("kinetube couldn't read the clipboard.", { description: 'Paste the link into the link field instead.' });
    }
  }, [openLink]);

  const run = useCallback((action: CommandAction) => {
    if (action.kind === 'page') changePage(action.page);
    else if (action.kind === 'theme') setTheme(action.theme);
    else if (action.kind === 'fetch') openLink(action.url);
    else void pasteAndFetch();
  }, [changePage, openLink, pasteAndFetch, setTheme]);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), run, pasteAndFetch };
}
