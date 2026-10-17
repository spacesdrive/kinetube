import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface LogoProps {
  // the mark's height in pixels; the wordmark follows the kit's lockup proportions from it
  size?: number;
  className?: string;
}

// the kit's lockup: the mark, then the lowercase wordmark in Unbounded 600, cap height about 45% of the mark
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: size * 0.3 }}>
      <Mark size={size} />
      <span className="font-display leading-none font-semibold tracking-[-0.02em] text-ink" style={{ fontSize: size * 0.64 }}>
        kinetube
      </span>
    </span>
  );
}

// the mark is only ever ink on light grounds and white on dark ones
export function Mark({ size = 28, className }: LogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <img src="/brand/kinetube-mark-ink-192.png" alt="" width={size} height={size} className="size-full dark:hidden" />
      <img src="/brand/kinetube-mark-white-192.png" alt="" width={size} height={size} className="hidden size-full dark:block" />
    </span>
  );
}

export type ArtPlacement = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';

const PLACEMENTS: Record<ArtPlacement, string> = {
  'bottom-right': '-right-[14%] -bottom-[46%]',
  'top-right': '-right-[16%] -top-[48%]',
  'bottom-left': '-left-[14%] -bottom-[48%]',
  'top-left': '-left-[16%] -top-[46%]',
};

// three open arcs turning around one centre: the kit's motion idea, drawn whole and bleeding off one corner
export function OrbitArt({ placement = 'bottom-right', className }: { placement?: ArtPlacement; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className={cn('pointer-events-none absolute aspect-square w-[62%] max-w-none select-none', PLACEMENTS[placement], className)}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M 200 120 A 80 80 0 1 1 130.7 240" strokeWidth="26" opacity="0.5" />
        <path d="M 330 200 A 130 130 0 1 1 135 87.4" strokeWidth="20" opacity="0.32" />
        <path d="M 110 355.9 A 180 180 0 1 1 380 200" strokeWidth="14" opacity="0.2" />
      </g>
    </svg>
  );
}

export type PanelTone = 'deep' | 'soft';

export interface PanelProps {
  tone?: PanelTone;
  placement?: ArtPlacement;
  className?: string;
  children?: ReactNode;
}

// the ground a product picture sits on, the way Activepieces sets its pictures on a painted scene
export function Panel({ tone = 'deep', placement = 'bottom-right', className, children }: PanelProps) {
  return (
    <div className={cn('relative isolate overflow-hidden', tone === 'deep' ? 'bg-panel-deep text-spin' : 'bg-spin-soft text-spin-text/55', className)}>
      <OrbitArt placement={placement} className="-z-10" />
      {children}
    </div>
  );
}
