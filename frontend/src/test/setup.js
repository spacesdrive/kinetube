// Global Vitest setup for component tests. @testing-library/react's
// automatic post-test DOM cleanup depends on detecting a global afterEach
// hook, which requires `test.globals: true` - this project's vite.config.js
// deliberately keeps globals off (tests import from 'vitest' explicitly, like
// everywhere else in the codebase), so cleanup is registered by hand instead.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
