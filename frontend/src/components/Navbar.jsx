import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModeToggle } from './ModeToggle';

// ── Platform icons (inline SVG — preserve original brand colours) ─────────────

const YT_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const IG_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TX_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const SETTINGS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const TABS = [
  {
    id: 'youtube',
    label: 'YouTube',
    icon: YT_ICON,
    activeClass: 'bg-red-500 text-white shadow-sm hover:bg-red-600',
    inactiveClass: 'text-muted-foreground hover:text-red-500 hover:bg-red-50',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: IG_ICON,
    activeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm hover:from-purple-600 hover:to-pink-600',
    inactiveClass: 'text-muted-foreground hover:text-pink-500 hover:bg-pink-50',
  },
  {
    id: 'transcribe',
    label: 'Transcribe',
    icon: TX_ICON,
    activeClass: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm hover:from-blue-600 hover:to-purple-600',
    inactiveClass: 'text-muted-foreground hover:text-blue-500 hover:bg-blue-50',
  },
];

export default function Navbar({ platform, onPlatformChange, onSettingsClick }) {
  return (
    <nav className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-muted/60 backdrop-blur-sm rounded-full p-1">
        {TABS.map((tab) => {
          const active = platform === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPlatformChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 select-none',
                active ? tab.activeClass : tab.inactiveClass
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        className={cn(
          'rounded-full transition-all duration-150',
          platform === 'settings'
            ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title="Settings"
      >
        {SETTINGS_ICON}
      </Button>

      <ModeToggle />
    </nav>
  );
}
