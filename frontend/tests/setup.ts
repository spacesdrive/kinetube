import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals stay off, so Testing Library cannot register its own cleanup between tests
afterEach(cleanup);

// jsdom has no matchMedia; next-themes asks it for the system theme, so tests answer "light"
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
