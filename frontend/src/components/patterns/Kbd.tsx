import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

export default function Kbd({ children, className }: KbdProps) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong px-1 font-sans text-[11px] font-medium text-ink-faint', className)}>
      {children}
    </kbd>
  );
}
