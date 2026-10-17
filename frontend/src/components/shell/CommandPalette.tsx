import { ArrowRight, ClipboardPaste, Link2, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { filterCommands } from '@/lib/commands';
import { looksLikeLink } from '@/lib/urlCleaners';
import { cn } from '@/lib/utils';

import type { KeyboardEvent } from 'react';
import type { Command, CommandAction } from '@/lib/commands';

export interface CommandPaletteProps {
  onRun(action: CommandAction): void;
  onClose(): void;
}

function CommandIcon({ command }: { command: Command }) {
  if (command.action.kind === 'fetch') return <Link2 size={15} />;
  if (command.action.kind === 'paste') return <ClipboardPaste size={15} />;
  return <ArrowRight size={15} />;
}

// opened with Ctrl or Cmd and K; typing filters, the arrow keys move, Enter runs the highlighted command
export default function CommandPalette({ onRun, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const commands = useMemo(() => filterCommands(query, looksLikeLink(query)), [query]);
  const safeIndex = Math.min(activeIndex, Math.max(0, commands.length - 1));

  function run(command: Command | undefined) {
    if (!command) return;
    onRun(command.action);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((safeIndex + step + commands.length) % Math.max(1, commands.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(commands[safeIndex]);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Commands</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-divider px-4">
          <Search size={16} aria-hidden="true" className="text-ink-faint" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={commands[safeIndex] ? `${listId}-${commands[safeIndex].id}` : undefined}
            aria-label="Search commands or paste a link"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or paste a link"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
        <ul id={listId} role="listbox" aria-label="Commands" className="scrollbar-quiet max-h-80 overflow-y-auto p-1.5">
          {commands.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-muted">Nothing matches "{query}".</li>}
          {commands.map((command, index) => (
            <li
              key={command.id}
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={index === safeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => run(command)}
              className={cn('flex cursor-default items-center gap-2.5 rounded-row px-3 py-2 text-sm text-ink transition-quiet', index === safeIndex && 'bg-surface-hover')}
            >
              <span className="text-ink-faint"><CommandIcon command={command} /></span>
              <span className="flex-1 truncate">{command.label}</span>
              <span className="text-xs text-ink-faint">{command.group}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
