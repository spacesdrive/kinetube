import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals stay off, so Testing Library cannot register its own cleanup between tests
afterEach(cleanup);
