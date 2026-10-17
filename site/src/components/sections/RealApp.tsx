import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

import { Panel } from '@/components/brand';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/cn';

import { SectionHeader } from './blocks';

// the README recordings: the real pages, filmed with Flute (docs/workflows/DEMOS.md)
const CLIPS = [
  { id: 'youtube-video', label: 'A video', alt: 'A YouTube video open in kinetube, with its preview beside the quality choices.' },
  { id: 'youtube-playlist', label: 'A playlist', alt: 'A playlist in kinetube with videos being ticked one by one.' },
  { id: 'youtube-channel', label: 'A channel', alt: 'The Live tab of a YouTube channel in kinetube, with live and upcoming streams marked.' },
  { id: 'batch-download', label: 'Batch', alt: 'The batch download page with a video, a playlist and a channel read at once.' },
  { id: 'transcribe', label: 'Transcribe', alt: 'The Transcribe page with the Whisper model settings.' },
  { id: 'themes', label: 'Themes', alt: 'The same kinetube page in the light and the dark theme.' },
] as const;

// plays only while on screen and while the reader has not paused it
function useClipPlayback(video: HTMLVideoElement | null, isPaused: boolean): void {
  useEffect(() => {
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isPaused) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: 0.4 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [video, isPaused]);
}

export function RealApp() {
  const shouldReduceMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [isPausedByReader, setIsPausedByReader] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const clip = CLIPS[active] ?? CLIPS[0];
  const isPaused = isPausedByReader || shouldReduceMotion;
  useClipPlayback(video, isPaused);

  return (
    <section id="real-app" aria-labelledby="real-app-heading" className="container-page flex scroll-mt-24 flex-col gap-8 py-24 md:gap-12 md:py-32">
      <SectionHeader id="real-app-heading" title="This is the real app." lead="These clips show kinetube's own pages, filmed with sample data. Pick one to watch." />
      <div ref={tabs} role="tablist" aria-label="Clips" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CLIPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors', index === active ? 'bg-ink text-ink-inverse' : 'bg-surface text-ink-muted hover:text-ink')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Panel placement="bottom-left" className="rounded-panel p-3 sm:p-8 lg:p-12">
        <div className="relative mx-auto max-w-[60rem] overflow-hidden rounded-card shadow-window">
          <video key={clip.id} ref={setVideo} className="block aspect-[1152/800] w-full bg-panel-deep" poster={`/media/${clip.id}.webp`} muted loop playsInline preload="none" aria-label={clip.alt}>
            <source src={`/media/${clip.id}.av1.mp4`} type='video/mp4; codecs="av01.0.08M.08"' />
            <source src={`/media/${clip.id}.mp4`} type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={() => setIsPausedByReader((current) => !current)}
            aria-label={isPaused ? 'Play the clip' : 'Pause the clip'}
            className="absolute bottom-3 left-3 flex h-10 items-center gap-2 rounded-full bg-panel-deep/85 px-4 text-sm font-semibold text-on-deep backdrop-blur-sm"
          >
            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            <span className="hidden sm:inline">{isPaused ? 'Play' : 'Pause'}</span>
          </button>
        </div>
      </Panel>
    </section>
  );
}
