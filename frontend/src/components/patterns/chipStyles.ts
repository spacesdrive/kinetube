import { cn } from '@/lib/utils';

// the pill shared by FilterChips (pick one) and ToggleChips (pick several)
export function chipClassName(isActive: boolean): string {
  return cn(
    'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[13px] font-medium transition-quiet',
    isActive ? 'border-transparent bg-inverse text-ink-inverse' : 'border-line-strong text-ink-muted hover:bg-surface-hover hover:text-ink',
  );
}
