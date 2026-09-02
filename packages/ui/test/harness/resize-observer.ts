import { vi } from 'vitest';

/**
 * Stub the global ResizeObserver and hand back a way to trigger its
 * callback, plus the observe/disconnect spies. Extracted from
 * `test/primitives/graph.test.ts` (#2223) so every suite that composes
 * `observeResize` -- graph.ts's own tests, and every component that composes
 * it directly (ChartContainer, #2224) -- shares one fake instead of
 * hand-rolling it per suite.
 *
 * Caller owns `vi.unstubAllGlobals()` after the test, matching every other
 * `vi.stubGlobal` usage in this codebase.
 */
export function stubResizeObserver(): {
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
  observeSpy: ReturnType<typeof vi.fn>;
  disconnectSpy: ReturnType<typeof vi.fn>;
} {
  const observeSpy = vi.fn();
  const disconnectSpy = vi.fn();
  let resizeCallback: ResizeObserverCallback | undefined;

  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe = observeSpy;
      disconnect = disconnectSpy;
      unobserve = vi.fn();
    },
  );

  return {
    triggerResize: (entries) => {
      if (!resizeCallback) throw new Error('ResizeObserver callback was never registered');
      resizeCallback(entries as ResizeObserverEntry[], {} as ResizeObserver);
    },
    observeSpy,
    disconnectSpy,
  };
}
