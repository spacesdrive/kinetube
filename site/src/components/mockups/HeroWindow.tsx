import { Check, Download, FileText, Layers, PanelLeft, Search, Settings, SunMoon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand';
import { InstagramIcon, YouTubeIcon } from '@/components/marks';

import { QUALITIES } from './motion';
import { Bar, Thumbnail } from './kit';
import { VIDEO } from './sample';

const NAV = [
  { label: 'YouTube', icon: YouTubeIcon, isActive: true },
  { label: 'Instagram', icon: InstagramIcon, isActive: false },
  { label: 'Batch download', icon: Layers, isActive: false },
];

function Sidebar() {
  return (
    <aside className="hidden w-[208px] shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
      <Logo size={22} />
      <p className="label mt-7 px-2 text-[10px] text-ink-muted">Download</p>
      <ul className="mt-2 flex flex-col gap-0.5 text-[13px]">
        {NAV.map(({ label, icon: Icon, isActive }) => (
          <li key={label} className={cn('flex items-center gap-2.5 rounded-row px-2 py-1.5', isActive ? 'bg-surface-selected font-semibold text-ink' : 'text-ink-muted')}>
            <Icon className={cn('size-4', isActive && 'text-youtube')} />
            {label}
          </li>
        ))}
      </ul>
      <p className="label mt-5 px-2 text-[10px] text-ink-muted">Tools</p>
      <p className="mt-2 flex items-center gap-2.5 px-2 py-1.5 text-[13px] text-ink-muted">
        <FileText className="size-4" />
        Transcribe
      </p>
      <div className="mt-auto flex flex-col gap-1 text-[13px] text-ink-muted">
        <p className="flex items-center gap-2.5 px-2 py-1.5"><SunMoon className="size-4" />Theme</p>
        <p className="flex items-center gap-2.5 px-2 py-1.5"><Settings className="size-4" />Settings</p>
      </div>
    </aside>
  );
}

function DownloadPanel() {
  return (
    <div className="flex w-full flex-col rounded-card border border-line bg-surface-elevated p-4 sm:w-[300px] sm:shrink-0">
      <p className="text-[15px] font-semibold text-ink">Download</p>
      <p className="text-xs text-ink-muted">Up to 2160p on YouTube</p>
      <div className="mt-3 flex gap-4 border-b border-line text-xs">
        <span className="border-b-2 border-spin pb-2 font-semibold text-ink">Video and audio</span>
        <span className="pb-2 text-ink-muted">Audio only</span>
      </div>
      <ul className="mt-2 flex flex-col gap-0.5 text-xs">
        {QUALITIES.map((quality, index) => (
          <li key={quality} className={cn('flex items-center gap-2 rounded-row px-2 py-1.5', index === 0 ? 'bg-spin-soft font-semibold text-ink' : 'text-ink-muted', index > 4 && 'hidden')}>
            <span className={cn('grid size-3.5 place-items-center rounded-full border', index === 0 ? 'border-spin bg-spin' : 'border-line-strong')}>
              {index === 0 && <Check className="size-2.5 text-on-spin" strokeWidth={3} />}
            </span>
            {quality}
            {index < 4 && <span className="ml-auto text-[10px] text-ink-muted">Merged with FFmpeg</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-start justify-between gap-3 border-t border-line pt-3">
        <span>
          <span className="block text-xs font-semibold text-ink">Transcribe after download</span>
          <span className="block text-[10px] text-ink-muted">Writes a text transcript with Whisper, on this computer</span>
        </span>
        <span className="mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full bg-line-strong p-0.5"><span className="size-3 rounded-full bg-surface-elevated" /></span>
      </div>
      <span className="mt-3 flex h-9 items-center justify-center gap-2 rounded-full bg-spin text-xs font-semibold text-on-spin">
        <Download className="size-3.5" />
        Download Best available
      </span>
      {/* the download runs, then the row settles on Complete; CSS keeps this off the animation library */}
      <div className="mt-3 flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <span className="hero-progress block h-full rounded-full bg-spin" />
        </span>
        <span className="hero-done inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
          <Check className="size-3" />
          Complete
        </span>
      </div>
    </div>
  );
}

// the kinetube window with a video open, drawn from the app's real layout and labels
export function HeroWindow({ className }: { className?: string }) {
  return (
    <div role="img" aria-label="The kinetube window with a YouTube video open: the preview on the left, and on the right the Best available quality picked and its download running to Complete." className={cn('flex overflow-hidden rounded-card border border-line bg-app text-left shadow-window', className)}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-3 border-b border-line px-4">
          <PanelLeft className="hidden size-4 text-ink-muted sm:block" />
          <span className="hidden text-xs text-ink-muted sm:inline">YouTube <span className="px-1">/</span> <span className="text-ink">Video</span></span>
          <span className="ml-auto flex h-7 w-full max-w-[16rem] items-center gap-2 rounded-full bg-surface px-3 text-[11px] text-ink-muted">
            <Search className="size-3.5" />
            Search or paste a link
            <span className="ml-auto hidden rounded-sm border border-line px-1 font-mono text-[10px] sm:inline">Ctrl K</span>
          </span>
          <span className="rounded-full bg-spin px-3 py-1.5 text-[11px] font-semibold text-on-spin">Fetch</span>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="hidden min-w-0 flex-1 flex-col gap-3 sm:flex">
            <p className="truncate rounded-full bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-muted">{VIDEO.url}</p>
            <Thumbnail src={VIDEO.thumbnail} className="aspect-video w-full" length={VIDEO.length} isEager />
            <p className="text-sm font-semibold text-ink">{VIDEO.title}</p>
            <p className="text-[11px] text-ink-muted">{VIDEO.channel} · {VIDEO.views} · {VIDEO.date}</p>
            <Bar className="w-11/12" />
            <Bar className="w-3/4" />
          </div>
          <DownloadPanel />
        </div>
      </div>
    </div>
  );
}
