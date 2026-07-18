import { describe, expect, it } from 'vitest';
import {
  skeletonBaseClasses,
  skeletonClasses,
} from '../../../src/components/skeleton/skeleton.classes';

function root(): string {
  return skeletonClasses({}, {}).root;
}

describe('skeleton classes', () => {
  it('carries the pulse shimmer', () => {
    expect(root()).toContain('animate-pulse');
  });

  it('honours reduced motion -- the pulse opts out under prefers-reduced-motion', () => {
    expect(root()).toContain('motion-reduce:animate-none');
  });

  it('is a rounded, muted surface (semantic token, not a raw colour utility)', () => {
    expect(root()).toContain('rounded-md');
    expect(root()).toContain('bg-muted');
  });

  it('is a single constant class string -- no config, no variant channel', () => {
    expect(root()).toBe(skeletonBaseClasses);
  });
});
