import { afterAll, vi } from 'vitest';
import * as srAnnouncer from '../../src/primitives/sr-announcer';

/**
 * Silence `announceToScreenReader` for a suite and hand back the spy so the
 * suite can assert on what would have been announced.
 *
 * A namespace spy rather than `vi.mock`: the unit project runs with
 * `isolate: false`, so a consumer module an earlier file already evaluated
 * keeps its binding to the real export, which a mock factory cannot reach.
 * The spy replaces the export in place and restores itself after the suite
 * so the stub never leaks into the next file in the worker.
 *
 * Call at module top level, next to the suite's imports.
 */
export function stubAnnounceToScreenReader(): ReturnType<
  typeof vi.spyOn<typeof srAnnouncer, 'announceToScreenReader'>
> {
  const spy = vi.spyOn(srAnnouncer, 'announceToScreenReader').mockImplementation(() => {});
  afterAll(() => {
    spy.mockRestore();
  });
  return spy;
}
