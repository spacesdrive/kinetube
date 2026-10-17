import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowRight, ChevronDown, Menu as MenuIcon, X } from 'lucide-react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/cn';
import { DOWNLOAD_URL, GITHUB_URL } from '@/lib/links';

import { Logo } from './brand';
import { GitHubIcon } from './marks';
import { MenuColumns } from './MenuColumns';
import { MENUS } from './navLinks';
import { Pill } from './Pill';
import { ThemeToggle } from './ThemeToggle';

const TRIGGER = 'flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-surface-hover';

// the panel's height follows its contents, so it eases between menus of different sizes
function usePanelHeight() {
  const contents = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = contents.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { contents, height };
}

function useScrolled(): boolean {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return isScrolled;
}

// a floating island; a menu opens inside it below a hairline, so the bar and its panel read as one surface that grows
export function Navbar() {
  const shouldReduceMotion = usePrefersReducedMotion();
  const location = useLocation();
  const island = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const isScrolled = useScrolled();
  const { contents, height } = usePanelHeight();

  // moving to another page closes the menu behind it
  const here = location.pathname + location.hash;
  const [lastPath, setLastPath] = useState(here);
  if (here !== lastPath) {
    setLastPath(here);
    setOpen(null);
  }

  // the panel keeps showing the last menu while it closes, so its contents fade with it
  const [shown, setShown] = useState<string | null>(null);
  if (open && open !== shown) setShown(open);
  const menu = MENUS.find((candidate) => candidate.id === shown);
  const close = () => setOpen(null);

  // a menu opened from the keyboard moves focus to its first item, and Escape hands focus back to its button
  const openFromKeyboard = (id: string, button: HTMLButtonElement) => {
    trigger.current = button;
    setOpen(id);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#nav-panel a')?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(null);
      trigger.current?.focus();
      trigger.current = null;
    };
    const onDown = (event: globalThis.PointerEvent) => {
      if (!island.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // hovering opens at once; leaving waits a moment so a pointer cutting a corner into the panel does not shut it
  const hoverOpen = (id: string) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    setOpen(id);
  };
  const hoverLeave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || open === 'mobile') return;
    closeTimer.current = window.setTimeout(() => setOpen(null), 160);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 md:pt-4">
      <div className="container-page">
        <div
          ref={island}
          onPointerLeave={hoverLeave}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          className={cn(
            'overflow-hidden rounded-card ring-1 backdrop-blur-md transition-[background-color,box-shadow] duration-300 ease-out',
            isScrolled || open ? 'bg-surface-elevated/95 shadow-popover ring-line' : 'bg-surface-elevated/70 ring-line',
          )}
        >
          <nav aria-label="Main" className="flex h-16 items-center justify-between gap-3 px-4 md:h-[68px] md:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
            <Link to="/" aria-label="kinetube home" className="flex min-h-11 shrink-0 items-center justify-self-start">
              <Logo size={28} />
            </Link>

            <ul className="hidden items-center gap-1 justify-self-center lg:flex">
              {MENUS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-expanded={open === item.id}
                    aria-controls="nav-panel"
                    onPointerEnter={hoverOpen(item.id)}
                    onClick={(event) => {
                      // detail is 0 when Enter or Space pressed the button rather than a pointer
                      if (event.detail === 0 && open !== item.id) openFromKeyboard(item.id, event.currentTarget);
                      else setOpen((current) => (current === item.id ? null : item.id));
                    }}
                    className={cn(TRIGGER, open === item.id && 'bg-surface-hover')}
                  >
                    {item.label}
                    <ChevronDown className={cn('-mr-0.5 size-4 transition-transform duration-200', open === item.id && 'rotate-180')} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 justify-self-end">
              <ThemeToggle className="hidden sm:flex" />
              <span className="hidden md:inline-flex">
                <Pill href={GITHUB_URL} variant="soft" size="sm">
                  <GitHubIcon className="size-4" />
                  GitHub
                </Pill>
              </span>
              <Pill href={DOWNLOAD_URL} size="sm" className="pr-3">
                Download
                <ArrowRight className="-mr-0.5 size-4 transition-transform group-hover:translate-x-0.5" />
              </Pill>
              <button
                type="button"
                aria-expanded={open === 'mobile'}
                aria-controls="nav-panel"
                aria-label={open === 'mobile' ? 'Close menu' : 'Open menu'}
                onClick={() => setOpen((current) => (current === 'mobile' ? null : 'mobile'))}
                className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-hover lg:hidden"
              >
                {open === 'mobile' ? <X className="size-6" /> : <MenuIcon className="size-6" />}
              </button>
            </div>
          </nav>

          <div
            id="nav-panel"
            inert={!open}
            className="overflow-hidden"
            style={{
              height: open ? height : 0,
              opacity: open ? 1 : 0,
              transition: shouldReduceMotion ? 'none' : 'height 380ms var(--ease-panel), opacity 240ms var(--ease-panel)',
            }}
          >
            <div ref={contents}>
              {shown && (
                <div key={shown} className="nav-panel-in mx-4 border-t border-line pt-4 pb-6 md:mx-6">
                  {shown === 'mobile' ? <PhoneMenu onDone={close} /> : menu && <MenuColumns columns={menu.columns} onDone={close} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// on a phone the menus stack inside the island, with full-width buttons below them
function PhoneMenu({ onDone }: { onDone: () => void }) {
  return (
    <div className="max-h-[calc(100svh-120px)] space-y-6 overflow-x-hidden overflow-y-auto">
      {MENUS.map((item) => (
        <MenuColumns key={item.id} columns={item.columns} onDone={onDone} isStacked />
      ))}
      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Pill href={DOWNLOAD_URL} className="w-full sm:w-auto">Download kinetube</Pill>
          <Pill href={GITHUB_URL} variant="soft" className="w-full sm:w-auto">View on GitHub</Pill>
        </div>
        <div className="flex items-center justify-between px-3 pt-2 text-sm text-ink-muted">
          Theme
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
