import { describe, expect, it } from 'vitest';
import {
  aspectRatioBaseClasses,
  aspectRatioChildFillClasses,
  aspectRatioClasses,
} from '../../../src/components/aspect-ratio/aspect-ratio.classes';

function root(config: Parameters<typeof aspectRatioClasses>[0]): string {
  return aspectRatioClasses(config, {}).root;
}

describe('aspect-ratio classes', () => {
  it('the wrapper is positioned and full-width so the ratio governs height', () => {
    expect(aspectRatioBaseClasses).toBe('relative w-full');
    expect(root({})).toContain('relative w-full');
  });

  it('children fill the box: absolute, inset-0, full width and height', () => {
    expect(root({})).toContain('[&>*]:absolute');
    expect(root({})).toContain('[&>*]:inset-0');
    expect(root({})).toContain('[&>*]:h-full');
    expect(root({})).toContain('[&>*]:w-full');
  });

  it('never forces object-fit on content -- the consumer supplies it', () => {
    expect(root({})).not.toContain('object-');
    expect(aspectRatioChildFillClasses).not.toContain('object-');
  });

  it('is config-independent -- the ratio rides the style channel, not a class', () => {
    expect(root({})).toBe(root({ ratio: 16 / 9 }));
  });

  it('emits no raw arbitrary color/size value (only the child-selector utilities)', () => {
    // The `[&>*]:` utilities are variant selectors, not arbitrary values;
    // there is no bracketed literal like [16/9] or [#fff].
    expect(root({})).not.toMatch(/\[[0-9.#][^\]]*\]/);
  });
});
