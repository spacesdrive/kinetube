import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export interface TypedProps {
  text: string;
  // starts typing; give the component a new key to type from the start again
  isActive: boolean;
  // characters a second
  speed?: number;
}

// text typed out a few characters at a time, with a blinking caret while it types
export function Typed({ text, isActive, speed = 24 }: TypedProps) {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive || shouldReduceMotion) return;
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) window.clearInterval(timer);
        return Math.min(text.length, current + 2);
      });
    }, 2000 / speed);
    return () => window.clearInterval(timer);
  }, [isActive, shouldReduceMotion, text, speed]);

  const shown = shouldReduceMotion ? text.length : count;
  const isTyping = isActive && !shouldReduceMotion && shown < text.length;
  return (
    <>
      {text.slice(0, shown)}
      {isTyping && <span className="caret ml-px inline-block h-[1.05em] w-[1.5px] translate-y-[0.15em] bg-ink" />}
    </>
  );
}
