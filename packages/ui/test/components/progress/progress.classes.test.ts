import { describe, expect, it } from 'vitest';
import { progressClasses } from '../../../src/components/progress/progress.classes';

describe('progress classes', () => {
  it('track carries the fixed decoration plus the size height', () => {
    const { root } = progressClasses({}, {});
    expect(root).toContain('bg-muted');
    expect(root).toContain('rounded-full');
    expect(root).toContain('overflow-hidden');
    expect(root).toContain('h-2'); // default size

    expect(progressClasses({ size: 'sm' }, {}).root).toContain('h-1');
    expect(progressClasses({ size: 'lg' }, {}).root).toContain('h-3');
  });

  it('indicator defaults to the primary fill', () => {
    const { indicator } = progressClasses({}, {});
    expect(indicator).toContain('bg-primary');
  });

  it('fill selects the indicator surface, never a raw color literal', () => {
    expect(progressClasses({ fill: 'destructive' }, {}).indicator).toContain('bg-destructive');
    expect(progressClasses({ fill: 'success' }, {}).indicator).toContain('bg-success');
  });

  it('the indeterminate animation is keyed off data-state -- same class string either way', () => {
    // Statics render once; there is no branch here that swaps class strings
    // by config. The behavior projects data-state, the selector reacts.
    expect(progressClasses({ value: 10 }, {}).indicator).toBe(progressClasses({}, {}).indicator);
    expect(progressClasses({}, {}).indicator).toContain(
      'data-[state=indeterminate]:animate-progress-indeterminate',
    );
  });
});
