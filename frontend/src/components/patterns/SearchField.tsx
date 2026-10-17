import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SearchFieldProps {
  value: string;
  label: string;
  placeholder?: string;
  onChange(value: string): void;
  className?: string;
}

export default function SearchField({ value, label, placeholder, onChange, className }: SearchFieldProps) {
  return (
    <div className={cn('relative flex h-10 min-w-0 items-center rounded-control border border-line-strong bg-app transition-quiet focus-within:border-focus', className)}>
      <Search size={16} aria-hidden="true" className="pointer-events-none ml-3 flex-shrink-0 text-ink-faint" />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear the search" onClick={() => onChange('')} className="mr-1.5 flex size-7 items-center justify-center rounded-pill text-ink-faint transition-quiet hover:bg-surface-hover hover:text-ink">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
