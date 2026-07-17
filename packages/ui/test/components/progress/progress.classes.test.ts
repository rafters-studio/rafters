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
    expect(indicator).not.toContain('animate-progress-indeterminate');
  });

  it('indeterminate indicator carries the animation utility', () => {
    const { indicator } = progressClasses({}, {});
    expect(indicator).toContain(progressIndeterminateClasses);
  });

  it('sizes map to a fixed height scale', () => {
    expect(progressSizeClasses).toEqual({ sm: 'h-1', default: 'h-2', lg: 'h-3' });
  });
});
