import { describe, expect, it } from 'vitest';
import {
  skeletonBaseClasses,
  skeletonClasses,
} from '../../../src/components/skeleton/skeleton.classes';

function root(): string {
  return skeletonClasses({}, {}).root;
}

describe('skeleton classes', () => {
  it('carries the shimmer cell utility, not the stock animate-pulse', () => {
    expect(root()).toContain('animate-pulse-shimmer');
    expect(root().split(/[\s:]+/)).not.toContain('animate-pulse');
  });

  it('never stops the shimmer under reduced motion -- period cells are exempt', () => {
    // #2155: motion-reduce:animate-none is removed, not replaced. The loop
    // slows only if a designer retunes period-shimmer; reduced motion never
    // stops it (the compiled-layer guarantee lives at
    // packages/design-tokens/test/exporters/motion-utilities.test.ts, the
    // "reduced motion zeroes every tier-kind cell and no period-kind cell"
    // case).
    expect(root()).not.toContain('motion-reduce:animate-none');
  });

  // `skeleton / root / content ready` assigns a fade-out (tier `fast`, curve
  // role `exit`) that Skeleton cannot key off anything: no config, no state,
  // and "content ready" is the consumer unmounting the element. A
  // `data-[state=ready]:` hook would name a state nothing sets -- the dead
  // class #2225 removed elsewhere -- so the row is reported, not faked.
  it('names no content-ready fade, since no state drives one', () => {
    expect(root()).not.toContain('animate-fade-out-fast-exit');
    expect(root()).not.toContain('data-[state=');
  });

  it('is a rounded, muted surface (semantic token, not a raw colour utility)', () => {
    expect(root()).toContain('rounded-md');
    expect(root()).toContain('bg-muted');
  });

  it('is a single constant class string -- no config, no variant channel', () => {
    expect(root()).toBe(skeletonBaseClasses);
  });
});
