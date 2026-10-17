import { cn } from '@/lib/utils';
import { chipClassName } from './chipStyles';

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
            className={chipClassName(isActive)}
          >
            {chip.label}
            {chip.count !== undefined && <span className={cn('tabular-nums', isActive ? 'opacity-70' : 'text-ink-faint')}>{chip.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
