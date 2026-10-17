import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface BrowserWindowProps {
  // the address in the bar; generic on purpose, since these windows stand for no real site
  url: string;
  className?: string;
  children: ReactNode;
}

// a plain browser window: three dots, an address pill, then the page
export function BrowserWindow({ url, className, children }: BrowserWindowProps) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface-elevated shadow-window', className)}>
      <div className="flex h-10 items-center gap-3 border-b border-line bg-surface px-3.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="mx-auto flex h-6 max-w-[60%] min-w-0 items-center gap-1.5 rounded-full bg-surface-elevated px-3 font-mono text-[11px] text-ink-muted ring-1 ring-line">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">{url}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

// the card a feature panel holds, 544 by 448 at desktop size like the Activepieces panels
export function PanelCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('relative w-full max-w-[34rem] overflow-hidden rounded-card border border-line bg-surface-elevated shadow-window', className)}>{children}</div>;
}

// a grey line standing in for text the picture does not need to spell out
export function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block h-2 rounded-full bg-line-strong', className)} />;
}

export interface ThumbnailProps {
  src: string;
  className?: string;
  length?: string;
  isEager?: boolean;
}

// a real video thumbnail, saved with the site; the picture around it already has a label, so the image itself is decorative
export function Thumbnail({ src, className, length, isEager = false }: ThumbnailProps) {
  return (
    <span className={cn('relative block overflow-hidden rounded-row bg-surface', className)}>
      <img src={src} alt="" loading={isEager ? 'eager' : 'lazy'} decoding="async" className="size-full object-cover" />
      {length && <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-panel-deep/80 px-1 font-mono text-[10px] text-on-deep">{length}</span>}
    </span>
  );
}
