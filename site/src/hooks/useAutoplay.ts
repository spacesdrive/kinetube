import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

export interface Autoplay {
  phase: number;
  // counts finished loops, so a part that must start fresh each time can take it as its key
  loop: number;
  reduce: boolean;
}

// steps a picture through its phases while it is on screen: durations[n] is how long phase n holds, in seconds;
// the last phase holds, then the story loops; with reduced motion the picture rests on its last phase
export function useAutoplay(ref: RefObject<Element | null>, durations: readonly number[]): Autoplay {
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(ref, { amount: 0.35 });
  const last = durations.length - 1;
  const [state, setState] = useState({ phase: 0, loop: 0 });
  const isPlaying = !reduce && inView;

  useEffect(() => {
    if (!isPlaying) return;
    const holdFor = durations[state.phase] ?? 1;
    const timer = window.setTimeout(() => {
      setState((current) => (current.phase >= last ? { phase: 0, loop: current.loop + 1 } : { phase: current.phase + 1, loop: current.loop }));
    }, holdFor * 1000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, state.phase, last, durations]);

  return { phase: reduce ? last : state.phase, loop: state.loop, reduce };
}
