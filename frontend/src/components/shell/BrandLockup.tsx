import { cn } from '@/lib/utils';
import BrandMark from './BrandMark';

export interface BrandLockupProps {
  // the sidebar hides the wordmark when it collapses to icons
  isCompact?: boolean;
  className?: string;
}

// mark on the left, wordmark on the right; the gap is 30% of the mark's height, as the brand kit sets it
export default function BrandLockup({ isCompact = false, className }: BrandLockupProps) {
  return (
    <span className={cn('flex items-center gap-[9px]', className)}>
      <BrandMark className="size-7 animate-spin-once" />
      {!isCompact && <span className="font-display text-[19px] leading-none font-semibold tracking-[-0.02em] text-ink">kinetube</span>}
    </span>
  );
}
