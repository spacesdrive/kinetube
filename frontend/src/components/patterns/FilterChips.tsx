import { cn } from '@/lib/utils';

export interface FilterChip<Value extends string> {
  value: Value;
  label: string;
  count?: number;
}

export interface FilterChipsProps<Value extends string> {
  label: string;
  chips: readonly FilterChip<Value>[];
  value: Value;
  onChange(value: Value): void;
  className?: string;
}

export default function FilterChips<Value extends string>({ label, chips, value, onChange, className }: FilterChipsProps<Value>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => {
        const isActive = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[13px] font-medium transition-quiet',
              isActive ? 'border-transparent bg-inverse text-ink-inverse' : 'border-line-strong text-ink-muted hover:bg-surface-hover hover:text-ink',
            )}
          >
            {chip.label}
            {chip.count !== undefined && <span className={cn('tabular-nums', isActive ? 'opacity-70' : 'text-ink-faint')}>{chip.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
