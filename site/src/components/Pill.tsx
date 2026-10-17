import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/cn';
import { opensInNewTab } from '@/lib/links';

// spin is the one primary action per view; text on it is always on-spin, never white
export type PillVariant = 'spin' | 'soft' | 'ink';
export type PillSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<PillVariant, string> = {
  spin: 'bg-spin text-on-spin hover:bg-spin-hover',
  soft: 'bg-surface-elevated text-ink ring-1 ring-line-strong hover:bg-surface',
  ink: 'bg-ink text-ink-inverse hover:bg-ink/85',
};

const SIZES: Record<PillSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-7 text-base',
};

export interface PillProps {
  href: string;
  variant?: PillVariant;
  size?: PillSize;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

// the brand's pill button; a path inside the site uses the router, an installer downloads in place, anything else opens in a new tab
export function Pill({ href, variant = 'spin', size = 'md', className, children, onClick }: PillProps) {
  const classes = cn(
    'group inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-150',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  if (href.startsWith('/')) {
    return <Link to={href} className={classes} onClick={onClick}>{children}</Link>;
  }
  if (!opensInNewTab(href)) return <a href={href} className={classes} onClick={onClick}>{children}</a>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={classes} onClick={onClick}>{children}</a>;
}
