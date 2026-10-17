import { ArrowDownToLine, Command, Download, FileText, Layers, Monitor, Moon, Palette, RotateCcw, Sun } from 'lucide-react';

import { cn } from '@/lib/cn';

import { NASA_VIDEOS, PLAYLIST_URL, VIDEO } from '../sample';
import { Frame } from './Frame';

const ROW = 'flex items-center gap-3 rounded-control border border-line px-3 py-2.5';

export function ResumeMock() {
  const rows = [
    { file: NASA_VIDEOS[3]?.title ?? '', state: 'Paused', done: 64 },
    { file: NASA_VIDEOS[4]?.title ?? '', state: 'Interrupted', done: 31 },
  ];
  return (
    <Frame label="kinetube offering to resume two unfinished downloads, one paused at 64 percent and one interrupted at 31 percent." icon={<ArrowDownToLine className="size-4" />} title="Resume 2 unfinished downloads?">
      <p className="text-xs leading-5 text-ink-muted">These stopped before they finished. yt-dlp picks up where it left off.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.file} className={ROW}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink">{row.file}</p>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-spin" style={{ width: `${row.done}%` }} /></span>
              <p className="mt-1.5 text-[11px] text-ink-muted">{row.state} at {row.done}%</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink"><RotateCcw className="size-3" />Resume</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function BatchMock() {
  const links = [VIDEO.url, PLAYLIST_URL, 'https://www.youtube.com/@NASA/videos'];
  return (
    <Frame label="The Batch download page with three links pasted, one per line, ready to be read." icon={<Layers className="size-4" />} title="Batch download">
      <p className="text-[11px] font-semibold text-ink">Links to download</p>
      <div className="mt-1.5 rounded-control border border-line bg-surface p-3 font-mono text-[11px] leading-6 text-ink">
        {links.map((link) => <p key={link} className="truncate">{link}</p>)}
      </div>
      <span className="mt-3 flex h-9 items-center justify-center rounded-full bg-spin text-xs font-semibold text-on-spin">Read the links</span>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['To read', 3], ['Ready', 0], ['Failed', 0]].map(([label, count]) => (
          <span key={label} className="rounded-control bg-surface py-2"><span className="block text-sm font-semibold text-ink">{count}</span><span className="text-[10px] text-ink-muted">{label}</span></span>
        ))}
      </div>
    </Frame>
  );
}

export function PaletteMock() {
  const pages = ['YouTube', 'Instagram', 'Batch download', 'Transcribe', 'Settings'];
  return (
    <Frame label="The command palette, opened with Ctrl K, listing the pages it can go to." icon={<Command className="size-4" />} title="Search commands or paste a link" meta={<span className="rounded-sm border border-line px-1.5 font-mono text-[10px] text-ink-muted">Ctrl K</span>} bodyClassName="p-3">
      <p className="label px-2 pb-1.5 text-[10px] text-ink-muted">Go to</p>
      <ul className="flex flex-col gap-0.5 text-[13px]">
        {pages.map((page, index) => <li key={page} className={cn('rounded-row px-2 py-1.5', index === 0 ? 'bg-surface-hover text-ink' : 'text-ink-muted')}>{page}</li>)}
      </ul>
      <p className="label mt-3 px-2 pb-1.5 text-[10px] text-ink-muted">Commands</p>
      <p className="rounded-row px-2 py-1.5 text-[13px] text-ink-muted">Fetch the link on the clipboard</p>
      <p className="rounded-row px-2 py-1.5 text-[13px] text-ink-muted">Use the dark theme</p>
    </Frame>
  );
}

export function FileNamesMock() {
  return (
    <Frame label="The File names settings with a prefix and a suffix, and a preview of the name they give." icon={<FileText className="size-4" />} title="File names">
      <div className="grid grid-cols-2 gap-3">
        {[['Prefix', '[Space]'], ['Suffix', '[HD]']].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold text-ink">{label}</p>
            <p className="mt-1 rounded-control border border-line px-3 py-2 text-xs text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-control border border-line px-3 py-2.5 text-xs text-ink">
        Number the files
        <span className="flex h-4 w-7 items-center rounded-full bg-line-strong p-0.5"><span className="size-3 rounded-full bg-surface-elevated" /></span>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-ink">File name template</p>
      <p className="mt-1 rounded-control border border-line bg-surface px-3 py-2 font-mono text-xs text-ink">%(title)s</p>
      <p className="mt-3 truncate rounded-control bg-spin-soft px-3 py-2 font-mono text-[11px] text-ink">[Space] What It Takes [HD].mp4</p>
    </Frame>
  );
}

export function UpdatesMock() {
  return (
    <Frame label="The Update available dialog, with Later and Update now." icon={<Download className="size-4" />} title="Update available" meta={<span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-muted">v2.0.1</span>}>
      <p className="text-xs leading-5 text-ink-muted">Keep kinetube open until the download finishes.</p>
      <div className="mt-4 rounded-control border border-line p-3">
        <p className="flex justify-between text-[11px] text-ink-muted"><span>Downloading the update</span><span className="font-mono">48%</span></p>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface"><span className="block h-full w-[48%] rounded-full bg-spin" /></span>
      </div>
      <div className="mt-4 flex justify-end gap-2 text-xs font-semibold">
        <span className="rounded-full px-3 py-2 text-ink-muted">Later</span>
        <span className="flex items-center gap-1.5 rounded-full bg-spin px-3.5 py-2 text-on-spin"><Download className="size-3.5" />Update now</span>
      </div>
      <p className="mt-4 rounded-control bg-surface px-3 py-2 text-[11px] text-ink-muted">yt-dlp: This is the newest yt-dlp release.</p>
    </Frame>
  );
}

export function ThemesMock() {
  const options = [
    { label: 'Light', icon: Sun },
    { label: 'Dark', icon: Moon },
    { label: 'Match the system', icon: Monitor },
  ];
  return (
    <Frame label="The Appearance settings, where the theme can be Light, Dark or Match the system." icon={<Palette className="size-4" />} title="Appearance">
      <p className="text-[11px] font-semibold text-ink">Theme</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map(({ label, icon: Icon }, index) => (
          <span key={label} className={cn('flex flex-col items-center gap-2 rounded-control border px-2 py-3 text-center text-[11px]', index === 2 ? 'border-spin bg-spin-soft font-semibold text-ink' : 'border-line text-ink-muted')}>
            <Icon className="size-4" />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['light', 'dark'] as const).map((theme) => (
          <span key={theme} data-theme={theme} className="h-20 rounded-control border border-line bg-app p-2">
            <span className="block h-1.5 w-1/2 rounded-full bg-ink" />
            <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-line-strong" />
            <span className="mt-3 block h-3 w-10 rounded-full bg-spin" />
          </span>
        ))}
      </div>
    </Frame>
  );
}
