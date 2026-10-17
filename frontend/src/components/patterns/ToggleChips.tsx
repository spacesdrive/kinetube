import { cn } from '@/lib/utils';
import { chipClassName } from './chipStyles';

export interface ToggleChip<Value extends string> {
  value: Value;
  label: string;
  title?: string;
}

export interface ToggleChipsProps<Value extends string> {
  label: string;
  chips: readonly ToggleChip<Value>[];
  value: readonly Value[];
  onChange(value: Value[]): void;
  // the last chip left on stays on, for a choice that needs at least one
  isOneRequired?: boolean;
  className?: string;
}

// several chips that switch on and off on their own, kept in the order of the chips
export default function ToggleChips<Value extends string>({ label, chips, value, onChange, isOneRequired = false, className }: ToggleChipsProps<Value>) {
  function toggle(chipValue: Value) {
    const next = value.includes(chipValue) ? value.filter((item) => item !== chipValue) : [...value, chipValue];
    if (isOneRequired && next.length === 0) return;
    onChange(chips.map((chip) => chip.value).filter((item) => next.includes(item)));
  }

  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <button key={chip.value} type="button" aria-pressed={value.includes(chip.value)} title={chip.title} onClick={() => toggle(chip.value)} className={chipClassName(value.includes(chip.value))}>
          {chip.label}
        </button>
      ))}
    </div>
  );
}
