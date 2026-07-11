import { describe, expect, it } from 'vitest';
import {
  aspectRatioBaseClasses,
  aspectRatioChildFillClasses,
} from '../../../src/components/aspect-ratio/aspect-ratio.classes';

describe('aspect-ratio classes', () => {
  it('the wrapper is a positioned, full-width box', () => {
    expect(aspectRatioBaseClasses).toBe('relative w-full');
  });

  it('slotted children absolutely fill the box', () => {
    expect(aspectRatioChildFillClasses).toContain('[&>*]:absolute');
    expect(aspectRatioChildFillClasses).toContain('[&>*]:inset-0');
    expect(aspectRatioChildFillClasses).toContain('[&>*]:h-full');
    expect(aspectRatioChildFillClasses).toContain('[&>*]:w-full');
  });

  it('is a static class set -- no ratio in the string (ratio rides the style channel)', () => {
    expect(aspectRatioBaseClasses).not.toContain('aspect-');
    expect(aspectRatioChildFillClasses).not.toContain('aspect-');
  });
});
