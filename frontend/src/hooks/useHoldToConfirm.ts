import { useCallback, useEffect, useRef, useState } from 'react';

export interface HoldToConfirm {
  progress: number;
  isHolding: boolean;
  start(): void;
  cancel(): void;
}

// a destructive action needs a deliberate hold; letting go early cancels it and the bar drains back
export function useHoldToConfirm(holdMs: number, onConfirm: () => void): HoldToConfirm {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const frameRef = useRef<number | null>(null);
  const confirmRef = useRef(onConfirm);

  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);

  const stopFrames = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const start = useCallback(() => {
    stopFrames();
    const startedAt = performance.now();
    setIsHolding(true);

    function step() {
      const ratio = Math.min(1, (performance.now() - startedAt) / holdMs);
      setProgress(ratio);
      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      frameRef.current = null;
      setIsHolding(false);
      setProgress(0);
      confirmRef.current();
    }
    frameRef.current = requestAnimationFrame(step);
  }, [holdMs, stopFrames]);

  const cancel = useCallback(() => {
    stopFrames();
    setIsHolding(false);
    setProgress(0);
  }, [stopFrames]);

  useEffect(() => stopFrames, [stopFrames]);

  return { progress, isHolding, start, cancel };
}
