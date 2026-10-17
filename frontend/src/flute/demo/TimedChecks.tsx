import { useSceneTime } from '@webprodigies/flute';
import { useEffect } from 'react';

import type { RefObject } from 'react';

export interface TimedCheck {
  // authored scene time, before Flute's playback speed is applied
  atMs: number;
  index: number;
}

export interface TimedChecksProps {
  rootRef: RefObject<HTMLElement | null>;
  checks: TimedCheck[];
}

// clicks the real checkboxes as the scene plays; only this empty component follows the clock
export default function TimedChecks({ rootRef, checks }: TimedChecksProps) {
  const time = useSceneTime();

  useEffect(() => {
    const boxes = rootRef.current?.querySelectorAll<HTMLElement>('li [data-slot="checkbox"]');
    if (!boxes) return;
    for (const { atMs, index } of checks) {
      const box = boxes[index];
      if (box && box.hasAttribute('data-checked') !== time >= atMs) box.click();
    }
  }, [rootRef, checks, time]);

  return null;
}
