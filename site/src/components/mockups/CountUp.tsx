import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

import { cn } from '@/lib/cn';

export interface CountUpProps {
  value: number;
  // counts up from `from` while true, and rests at `from` while false
  isActive: boolean;
  from?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

// a whole number that counts up to its value, in fixed-width digits so the text around it never shifts
export function CountUp({ value, isActive, from = 0, suffix = '', duration = 1.4, className }: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const current = useMotionValue(shouldReduceMotion ? value : from);
  const text = useTransform(current, (shown) => `${Math.round(shown).toLocaleString('en-US')}${suffix}`);

  useEffect(() => {
    if (shouldReduceMotion) {
      current.jump(value);
      return;
    }
    if (!isActive) {
      current.jump(from);
      return;
    }
    const controls = animate(current, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [isActive, shouldReduceMotion, value, from, duration, current]);

  return <motion.span className={cn('tabular-nums', className)}>{text}</motion.span>;
}
