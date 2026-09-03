import { describe, expect, it } from 'vitest';
import {
  progressClasses,
  progressContainerClasses,
  progressIndeterminateClasses,
  progressIndicatorBaseClasses,
  progressSizeClasses,
  progressVariantClasses,
} from '../../../src/components/progress/progress.classes';

describe('progress classes', () => {
  it('root is the track surface plus the size class', () => {
    const { root } = progressClasses({ value: 50, size: 'lg' }, {});
    expect(root).toContain(progressContainerClasses);
    expect(root).toContain(progressSizeClasses.lg);
  });

  it('root defaults to the medium size when unspecified', () => {
    expect(progressClasses({ value: 50 }, {}).root).toContain(progressSizeClasses.default);
  });

  it('indicator composes the base fill plus the variant token', () => {
    const { indicator } = progressClasses({ value: 50, variant: 'success' }, {});
    expect(indicator).toContain(progressIndicatorBaseClasses);
    expect(indicator).toContain(progressVariantClasses.success);
  });

  it('variant fill is a role token, never a raw colour', () => {
    for (const cls of Object.values(progressVariantClasses)) {
      expect(cls).toMatch(/^bg-[a-z]+$/);
    }
  });

  it('determinate indicator does NOT carry the indeterminate animation', () => {
    const { indicator } = progressClasses({ value: 50 }, {});
    expect(indicator).not.toContain('animate-pulse-shimmer');
  });

  it('indeterminate indicator carries the animation utility', () => {
    const { indicator } = progressClasses({}, {});
    expect(indicator).toContain(progressIndeterminateClasses);
  });

  // `progress / root / indeterminate`: a loop on period `shimmer`, consumed as
  // the generated cell utility. `animate-progress-indeterminate`, which this
  // replaces, resolved to no utility, no theme key and no keyframes anywhere --
  // it painted nothing. A period-kind cell carries no motion-reduce escape by
  // design (#2155): a stopped work loop would say the work stopped.
  it('the indeterminate loop is the shimmer cell, with no dead name and no escape', () => {
    expect(progressIndeterminateClasses).toBe('animate-pulse-shimmer');
    expect(progressIndeterminateClasses).not.toContain('animate-progress-indeterminate');
    expect(progressIndeterminateClasses).not.toContain('motion-reduce:');
  });

  // `progress / fill / value change`: a fill on `inline-size / width`, tier
  // `moderate`, curve role `standard`. It is a transition, not a keyframe, and
  // it times the width the performances set -- not the variant's colour.
  it('the fill transition names the row and no literal timing', () => {
    expect(progressIndicatorBaseClasses).toContain('transition-[width]');
    expect(progressIndicatorBaseClasses).toContain('duration-moderate');
    expect(progressIndicatorBaseClasses).toContain('ease-standard');
    expect(progressIndicatorBaseClasses).not.toContain('transition-all');
    expect(progressIndicatorBaseClasses).not.toMatch(/duration-\d/);
  });

  // Reduced motion is the token sheet's job on BOTH halves: the tier-kind fill
  // zeroes on its duration leaf (REDUCED_MOTION_ZEROED), and the period-kind
  // loop is exempt by design (#2155). Neither wants a component-level escape,
  // so the absence of any is the assertion.
  it('neither the fill nor the loop carries a component-level reduced-motion escape', () => {
    expect(progressIndicatorBaseClasses).not.toContain('motion-reduce:');
    expect(progressIndeterminateClasses).not.toContain('motion-reduce:');
  });

  it('sizes map to a fixed height scale', () => {
    expect(progressSizeClasses).toEqual({ sm: 'h-1', default: 'h-2', lg: 'h-3' });
  });
});
