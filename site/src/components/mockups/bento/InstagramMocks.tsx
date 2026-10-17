import { Check, Download, Search, ShieldCheck, Users } from 'lucide-react';

import { InstagramIcon } from '@/components/marks';
import { cn } from '@/lib/cn';

import { Thumbnail } from '../kit';
import { NASA_VIDEOS, SHORT_THUMBNAIL, thumbnailOf } from '../sample';
import { Frame } from './Frame';

const KINDS = ['Post', 'Reel', 'Story'];

export function PostMock() {
  return (
    <Frame label="An Instagram reel open in kinetube, with its quality list and a Download button." icon={<InstagramIcon className="size-4 text-instagram" />} title="instagram.com/reel/C8mW2xLp">
      <div className="flex gap-1 rounded-full bg-surface p-0.5 text-[11px] font-medium">
        {KINDS.map((kind) => <span key={kind} className={cn('flex-1 rounded-full py-1 text-center', kind === 'Reel' ? 'bg-surface-elevated text-ink shadow-sm' : 'text-ink-muted')}>{kind}</span>)}
      </div>
      <div className="mt-3 flex gap-3">
        <Thumbnail src={SHORT_THUMBNAIL} className="aspect-[9/16] w-24 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-ink">Quality</p>
          <p className="text-[10px] text-ink-muted">Instagram serves one combined file per height.</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {['1920p', '1280p', '640p'].map((height, index) => (
              <li key={height} className={cn('rounded-row px-2 py-1', index === 0 ? 'bg-spin-soft font-semibold text-ink' : 'text-ink-muted')}>{height}</li>
            ))}
          </ul>
        </div>
      </div>
      <span className="mt-4 flex h-9 items-center justify-center gap-2 rounded-full bg-spin text-xs font-semibold text-on-spin"><Download className="size-3.5" />Download</span>
    </Frame>
  );
}

export function ProfileMock() {
  const picked = new Set([0, 2, 3]);
  return (
    <Frame label="An Instagram profile in kinetube, with posts in a grid and three of them selected." icon={<InstagramIcon className="size-4 text-instagram" />} title="@nasa" meta={<span className="text-[11px] text-ink-muted">3 selected</span>}>
      <p className="flex h-8 items-center gap-2 rounded-full bg-surface px-3 text-[11px] text-ink-muted"><Search className="size-3.5" />Search the posts</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {NASA_VIDEOS.slice(0, 6).map((video, index) => (
          <span key={video.id} className="relative">
            <Thumbnail src={thumbnailOf(video.id)} className={cn('aspect-video w-full', picked.has(index) && 'ring-2 ring-spin')} />
            {picked.has(index) && <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-spin"><Check className="size-3 text-on-spin" strokeWidth={3} /></span>}
          </span>
        ))}
      </div>
    </Frame>
  );
}

export function TwoFactorMock() {
  return (
    <Frame label="The Instagram login in kinetube asking for the verification code sent to the phone or email." icon={<ShieldCheck className="size-4" />} title="Log in to Instagram">
      <p className="text-xs leading-5 text-ink-muted">Enter the code Instagram sent to your phone or email.</p>
      <p className="mt-4 text-[11px] font-semibold text-ink">Verification code</p>
      <p className="mt-1 flex h-10 items-center rounded-control border border-ink-muted px-3 font-mono text-sm tracking-[0.3em] text-ink">482 913</p>
      <span className="mt-4 flex h-9 items-center justify-center rounded-full bg-spin text-xs font-semibold text-on-spin">Verify</span>
      <p className="mt-3 text-center text-[11px] text-ink-muted">Back to login</p>
    </Frame>
  );
}

export function AccountsMock() {
  const accounts = ['trail.notes', 'studio.lena', 'lisbon.eats'];
  return (
    <Frame label="Three saved Instagram logins in kinetube, each marked Ready." icon={<Users className="size-4" />} title="Instagram logins">
      <ul className="flex flex-col gap-2">
        {accounts.map((account) => (
          <li key={account} className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-surface text-xs font-semibold text-ink">{account.charAt(0).toUpperCase()}</span>
            <span className="flex-1 truncate text-[13px] text-ink">@{account}</span>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Ready</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-4 text-ink-muted">A saved login helps profiles load. Posts and reels download without one.</p>
    </Frame>
  );
}
