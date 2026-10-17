import { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { easeIn, easeOut, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';

import { Logo } from '@/components/brand';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

import { NODE_ICONS } from './nodeIcons';
import { Ring } from './Ring';
import { NODES } from './ringLayout';
import { AdSiteWindow, CheckWindow, LimitWindow, QueueWindow, SignUpWindow, UploadWindow } from './StoryWindows';

// scroll progress is eased toward where the reader is rather than snapped to it, settling in about a third of a second
const SMOOTH = { stiffness: 140, damping: 30, mass: 0.6, restDelta: 0.0001 };

interface FlyingWindowSpec {
  Comp: ComponentType;
  // where it rests, in percent of the stage
  at: [number, number];
  tilt: number;
  // where it flies in from, in vw and vh, and its tilt on the way
  from: [number, number, number];
  start: number;
  isFront: boolean;
}

// the measured layer order: back windows under the words, the words, then front windows passing over them
const WORDS_Z = 34;
const WINDOWS: FlyingWindowSpec[] = [
  { Comp: SignUpWindow, at: [50, 28], tilt: 2, from: [0, -115, 4], start: 0.3, isFront: false },
  { Comp: AdSiteWindow, at: [21, 33], tilt: -4, from: [-115, -31, -8], start: 0.312, isFront: false },
  { Comp: LimitWindow, at: [79, 33], tilt: 3, from: [115, -42, 6], start: 0.33, isFront: false },
  { Comp: UploadWindow, at: [22, 71], tilt: 5, from: [-89, 63, 10], start: 0.345, isFront: true },
  { Comp: CheckWindow, at: [50, 74], tilt: -2, from: [-26, 100, -4], start: 0.37, isFront: true },
  { Comp: QueueWindow, at: [78, 70], tilt: -5, from: [73, 58, -10], start: 0.385, isFront: true },
];
const FLY_IN = 0.14;
const LEAVE = 0.605;
const LEAVE_GAP = 0.009;
const LEAVE_FOR = 0.065;

function FlyingWindow({ spec, index, progress, size }: { spec: FlyingWindowSpec; index: number; progress: MotionValue<number>; size: number }) {
  const [restX, restY] = spec.at;
  const [fromX, fromY, fromTilt] = spec.from;
  const arrive = spec.start + FLY_IN;
  const leave = LEAVE + index * LEAVE_GAP;
  const gone = leave + LEAVE_FOR;
  const ease = [easeOut, (t: number) => t, easeIn];
  const stops = [spec.start, arrive, leave, gone];

  // in from off screen, rest, then drawn into the middle of the screen
  const x = useTransform(progress, stops, [`${fromX}vw`, '0vw', '0vw', `${50 - restX}vw`], { ease });
  const y = useTransform(progress, stops, [`${fromY}vh`, '0vh', '0vh', `${50 - restY}vh`], { ease });
  const rotate = useTransform(progress, stops, [fromTilt, spec.tilt, spec.tilt, 0], { ease });
  const scale = useTransform(progress, [leave, gone], [size, size * 0.05], { ease: easeIn });
  const opacity = useTransform(progress, [spec.start, spec.start + 0.004, leave, gone - 0.01], [0, 1, 1, 0]);

  const { Comp } = spec;
  return (
    // a point with no size at the resting place, so the window scales and tilts about its own centre
    <motion.div className="absolute size-0 will-change-transform" style={{ left: `${restX}%`, top: `${restY}%`, x, y, rotate, scale, opacity, zIndex: spec.isFront ? WORDS_Z + 1 : WORDS_Z - 1 }}>
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"><Comp /></div>
    </motion.div>
  );
}

const STATEMENT = 'display mx-auto max-w-[20ch] text-center text-[30px] leading-[36px] text-ink md:text-[44px] md:leading-[52px] xl:text-[52px] xl:leading-[60px]';

function Resolution() {
  return (
    <div className="mx-auto text-center">
      <Logo size={52} className="justify-center" />
      <p className="display mx-auto mt-7 max-w-[16ch] text-[32px] leading-[38px] text-ink md:text-[52px] md:leading-[58px]">
        It all runs <span className="text-spin-text">on your computer.</span>
      </p>
    </div>
  );
}

const CHIPS = NODES.filter((node) => node.label);

function ChipGrid({ className }: { className?: string }) {
  return (
    <ul className={cn('mx-auto grid w-full max-w-md grid-cols-2 gap-2', className)}>
      {CHIPS.map((node) => {
        const Icon = NODE_ICONS[node.id];
        return (
          <li key={node.id} className="flex items-center gap-2.5 rounded-control border border-line bg-surface-elevated px-3 py-2.5">
            {Icon && <Icon className="size-4 shrink-0 text-spin-text" />}
            <span className="text-[15px] leading-tight text-ink">{node.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

// the same three moments as plain sections, for readers who ask for less motion
function StillStory() {
  return (
    <div className="container-page space-y-24 py-24 md:py-32">
      <h2 id="story-heading" className={STATEMENT}>Saving a video got complicated.</h2>
      <p className={STATEMENT}>Most tools want an account, a monthly fee or your files on their server.</p>
      <div>
        <Resolution />
        <ChipGrid className="mt-12 max-w-2xl sm:grid-cols-4" />
      </div>
    </div>
  );
}

// windows are drawn at laptop size and scale with the screen, never below a size that still reads as a window
function useWindowScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(1.12, Math.max(0.5, window.innerWidth / 1440)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

function Beat({ opacity, filter, y, children }: { opacity: MotionValue<number>; filter: MotionValue<string>; y?: MotionValue<number>; children: ReactNode }) {
  return (
    <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5" style={{ opacity, filter, y, zIndex: WORDS_Z }}>
      {children}
    </motion.div>
  );
}

function MovingStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const size = useWindowScale();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // the spring also keeps every value on one clock, so opacity and blur do not run on the browser's own scroll timeline
  const progress = useSpring(scrollYProgress, SMOOTH);

  const oneOpacity = useTransform(progress, [0.22, 0.3], [1, 0]);
  const oneBlur = useTransform(progress, [0.22, 0.3], ['blur(0px)', 'blur(5px)']);
  const twoOpacity = useTransform(progress, [0.24, 0.32, 0.56, 0.6], [0, 1, 1, 0]);
  const twoBlur = useTransform(progress, [0.24, 0.32, 0.56, 0.6], ['blur(5px)', 'blur(0px)', 'blur(0px)', 'blur(5px)']);
  const endOpacity = useTransform(progress, [0.62, 0.66], [0, 1]);
  const endBlur = useTransform(progress, [0.62, 0.66], ['blur(5px)', 'blur(0px)']);
  const endY = useTransform(progress, [0.62, 0.66], [14, 0], { ease: easeOut });

  return (
    <div ref={sectionRef} className="relative h-[420vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <Ring progress={progress} />
        <div aria-hidden="true">
          {WINDOWS.map((spec, index) => <FlyingWindow key={index} spec={spec} index={index} progress={progress} size={size} />)}
        </div>
        {/* a glow of the page colour over the ring and under every window, so no wire runs through a line of text */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(40%_21%_at_50%_50%,var(--app)_58%,color-mix(in_oklab,var(--app)_78%,transparent)_73%,color-mix(in_oklab,var(--app)_26%,transparent)_88%,transparent_100%)]" />
        <Beat opacity={oneOpacity} filter={oneBlur}>
          <h2 id="story-heading" className={STATEMENT}>Saving a video got complicated.</h2>
        </Beat>
        <Beat opacity={twoOpacity} filter={twoBlur}>
          <p className={STATEMENT}>Most tools want an account, a monthly fee or your files on their server.</p>
        </Beat>
        <Beat opacity={endOpacity} filter={endBlur} y={endY}>
          <div>
            <Resolution />
            {/* the ring needs a wide screen; smaller screens list the same parts beneath the words */}
            <ChipGrid className="mt-8 lg:hidden" />
          </div>
        </Beat>
      </div>
    </div>
  );
}

// the problem, the pile of windows it brings, then kinetube with the tools it runs wired around it
export function Story() {
  const shouldReduceMotion = useReducedMotion();
  // phones get the still version too: the windows are drawn at laptop size
  const isWide = useMediaQuery('(min-width: 768px)');
  return (
    <section id="story" aria-labelledby="story-heading" className="relative bg-app">
      {shouldReduceMotion || !isWide ? <StillStory /> : <MovingStory />}
    </section>
  );
}
