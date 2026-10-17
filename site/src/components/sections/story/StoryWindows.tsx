import { Bell, CloudUpload, Lock, Mail, ShieldQuestion, Timer } from 'lucide-react';

import { Bar, BrowserWindow } from '@/components/mockups/kit';
import { cn } from '@/lib/cn';

// the old way, drawn as generic pages on reserved .example addresses, so they stand for no real site

const SIZE = 'w-[560px]';

export function AdSiteWindow() {
  return (
    <BrowserWindow url="free-video-saver.example" className={SIZE}>
      <div className="relative h-[330px] p-6">
        <Bar className="w-1/3" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {['DOWNLOAD', 'START NOW', 'DOWNLOAD HD'].map((label, index) => (
            <span key={label} className={cn('flex h-14 items-center justify-center rounded-row text-xs font-bold', index === 1 ? 'bg-success text-ink-inverse' : 'bg-info text-ink-inverse')}>{label}</span>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2"><Bar className="w-full" /><Bar className="w-5/6" /><Bar className="w-2/3" /></div>
        <div className="absolute inset-x-10 bottom-6 flex items-center gap-3 rounded-control bg-surface-elevated p-4 shadow-popover">
          <Bell className="size-5 shrink-0 text-ink-muted" />
          <p className="flex-1 text-[13px] text-ink">Allow notifications to continue to your file</p>
          <span className="rounded-full bg-surface-selected px-3 py-1.5 text-xs font-semibold text-ink">Allow</span>
        </div>
      </div>
    </BrowserWindow>
  );
}

export function SignUpWindow() {
  return (
    <BrowserWindow url="video-tools.example/signup" className={SIZE}>
      <div className="flex h-[330px] flex-col items-center justify-center gap-3 px-16">
        <Lock className="size-7 text-ink-muted" />
        <p className="text-lg font-semibold text-ink">Create an account to keep downloading</p>
        <p className="flex h-10 w-full items-center gap-2 rounded-control border border-line px-3 text-sm text-ink-muted"><Mail className="size-4" />Email address</p>
        <p className="flex h-10 w-full items-center rounded-control border border-line px-3 text-sm text-ink-muted">Password</p>
        <span className="flex h-10 w-full items-center justify-center rounded-control bg-surface-selected text-sm font-semibold text-ink">Sign up</span>
      </div>
    </BrowserWindow>
  );
}

export function LimitWindow() {
  return (
    <BrowserWindow url="video-tools.example/upgrade" className={SIZE}>
      <div className="h-[330px] p-8">
        <p className="flex items-center gap-2 text-lg font-semibold text-ink"><Timer className="size-5 text-error" />You've reached today's limit</p>
        <p className="mt-1 text-sm text-ink-muted">Upgrade to keep going.</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((plan) => (
            <span key={plan} className={cn('flex h-40 flex-col gap-2 rounded-control border p-3', plan === 1 ? 'border-ink' : 'border-line')}>
              <Bar className="w-1/2" />
              <Bar className="mt-2 w-3/4" />
              <Bar className="w-2/3" />
              <span className="mt-auto h-7 rounded-full bg-surface" />
            </span>
          ))}
        </div>
      </div>
    </BrowserWindow>
  );
}

export function UploadWindow() {
  return (
    <BrowserWindow url="transcribe-online.example" className={SIZE}>
      <div className="flex h-[330px] flex-col justify-center gap-4 px-12">
        <CloudUpload className="size-8 text-ink-muted" />
        <p className="text-lg font-semibold text-ink">Uploading interview.mp4</p>
        <span className="block h-2 overflow-hidden rounded-full bg-surface"><span className="block h-full w-[37%] rounded-full bg-info" /></span>
        <p className="text-sm text-ink-muted">Your file is processed on our servers.</p>
      </div>
    </BrowserWindow>
  );
}

export function QueueWindow() {
  return (
    <BrowserWindow url="transcribe-online.example/queue" className={SIZE}>
      <div className="flex h-[330px] flex-col justify-center gap-3 px-12">
        <p className="text-lg font-semibold text-ink">You're in the queue</p>
        <p className="text-sm text-ink-muted">We'll email your transcript when it's ready.</p>
        <div className="mt-3 flex flex-col gap-2"><Bar className="w-full" /><Bar className="w-4/5" /><Bar className="w-3/5" /></div>
      </div>
    </BrowserWindow>
  );
}

export function CheckWindow() {
  return (
    <BrowserWindow url="free-video-saver.example/verify" className={SIZE}>
      <div className="h-[330px] p-8">
        <p className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldQuestion className="size-5 text-ink-muted" />Prove you're not a robot</p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, index) => <span key={index} className={cn('h-20 rounded-row', index % 3 === 0 ? 'bg-line-strong' : 'bg-surface')} />)}
        </div>
      </div>
    </BrowserWindow>
  );
}
