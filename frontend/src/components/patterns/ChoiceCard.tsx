import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isSelected?: boolean;
  trailing?: ReactNode;
  onClick(): void;
  className?: string;
}

// the large, quiet option tile the reference uses to start a flow
export default function ChoiceCard({ icon: Icon, title, description, isSelected = false, trailing, onClick, className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3.5 rounded-choice p-5 text-left transition-quiet',
        isSelected ? 'bg-spin-soft' : 'bg-surface hover:bg-surface-selected',
        className,
      )}
    >
      <span className={cn('flex size-10 flex-shrink-0 items-center justify-center rounded-pill transition-quiet', isSelected ? 'bg-spin text-on-spin' : 'bg-app text-ink group-hover:text-spin-text')}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-6 font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-ink-muted">{description}</span>
      </span>
      {trailing}
    </button>
  );
}
