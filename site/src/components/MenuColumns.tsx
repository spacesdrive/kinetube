import { useRef, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/cn';

import type { MenuColumn, MenuItem } from './navLinks';

interface SpotBox {
  left: number;
  top: number;
  width: number;
  height: number;
  isHidden?: boolean;
}

type HoverEvent = PointerEvent<HTMLElement> | FocusEvent<HTMLElement>;

// one entry: an icon in a soft tile, a name, and a line about it
function MenuEntry({ item, onDone, onHover }: { item: MenuItem; onDone: () => void; onHover: (event: HoverEvent) => void }) {
  const Icon = item.icon;
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-ink">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="text-[15px] font-semibold text-ink">{item.title}</span>
        <span className="text-[13px] text-ink-muted">{item.description}</span>
      </span>
    </>
  );
  const classes = 'relative z-10 flex items-center gap-3.5 rounded-control px-3 py-2.5';
  const events = { onPointerEnter: onHover, onFocus: onHover };
  if (item.href.startsWith('/')) {
    return <Link to={item.href} className={classes} onClick={onDone} {...events}>{body}</Link>;
  }
  return <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes} onClick={onDone} {...events}>{body}</a>;
}

export interface MenuColumnsProps {
  columns: MenuColumn[];
  onDone: () => void;
  isStacked?: boolean;
}

// one soft highlight behind the items that slides to whichever the pointer or keyboard is on
export function MenuColumns({ columns, onDone, isStacked = false }: MenuColumnsProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<SpotBox | null>(null);
  const hover = (event: HoverEvent) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    const item = event.currentTarget.getBoundingClientRect();
    setSpot({ left: item.left - box.left, top: item.top - box.top, width: item.width, height: item.height });
  };
  return (
    <div ref={surface} onPointerLeave={() => setSpot((current) => current && { ...current, isHidden: true })} className={cn('relative flex gap-5', isStacked && 'flex-col gap-4')}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-control bg-surface-hover"
        style={{
          left: spot?.left ?? 0,
          top: spot?.top ?? 0,
          width: spot?.width ?? 0,
          height: spot?.height ?? 0,
          opacity: spot && !spot.isHidden ? 1 : 0,
          transition: 'opacity 130ms ease, left 220ms var(--ease-panel), top 220ms var(--ease-panel), width 220ms var(--ease-panel), height 220ms var(--ease-panel)',
        }}
      />
      {columns.map((column) => (
        <div key={column.heading} className="min-w-0 flex-1">
          <p className="label px-3 pb-2 text-ink-muted">{column.heading}</p>
          <ul className="flex flex-col gap-1">
            {column.items.map((item) => (
              <li key={item.title}>
                <MenuEntry item={item} onDone={onDone} onHover={hover} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
