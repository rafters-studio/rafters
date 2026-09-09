import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, expect, vi } from 'vitest';
import * as matchers from 'vitest-axe/matchers';

// Extend vitest with axe matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// The unit project runs with isolate: false, so one happy-dom environment
// serves every file a worker picks up. A fresh environment per file used to
// reset whatever a file left behind: fake timers still installed (they fake
// requestAnimationFrame too, so a later file awaiting a frame hangs), stubbed
// globals, spies on shared modules, and nodes attached to document.body by
// hand (RTL's returned queries are bound to document.body, so a leftover
// element makes a later file's getByRole find two). Restore that boundary at
// the end of every file. Hooks run stack-order, so a file's own afterAll runs
// before this one.
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
