import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

export interface SurfaceBoxProps extends ComponentProps<'section'> {
  padding?: 'none' | 'sm' | 'md';
}

const PADDING: Record<NonNullable<SurfaceBoxProps['padding']>, string> = { none: '', sm: 'p-4', md: 'p-5' };

// one flat raised area; the brand separates surfaces by tone, not by shadows
export default function SurfaceBox({ padding = 'md', className, ...props }: SurfaceBoxProps) {
  return <section className={cn('rounded-card bg-surface', PADDING[padding], className)} {...props} />;
}
