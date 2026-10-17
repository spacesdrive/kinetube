import markInk from '@/assets/brand/kinetube-mark-ink-96.png';
import markWhite from '@/assets/brand/kinetube-mark-white-96.png';
import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  className?: string;
}

// the ink mark on light grounds and the white mark on dark ones; CSS picks, so there is no flash on load
export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <span aria-hidden="true" className={cn('relative inline-block size-6 flex-shrink-0', className)}>
      <img src={markInk} alt="" className="absolute inset-0 size-full dark:hidden" />
      <img src={markWhite} alt="" className="absolute inset-0 hidden size-full dark:block" />
    </span>
  );
}
