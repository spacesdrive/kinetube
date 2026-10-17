import { useMediaQuery } from './useMediaQuery';

// the reader's reduced motion setting, without loading the animation library into the first bundle
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
