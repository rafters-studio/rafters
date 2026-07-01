/**
 * Typography color prop carries the fill signature in text context
 * (v2, #1637): plain words emit text-{word}; word-to-word emits gradient
 * text via bg-clip-text.
 */

import { describe, expect, it } from 'vitest';
import { tokenPropsToClasses } from '../../../src/old/ui/typography.classes';

describe('tokenPropsToClasses - fill signature color prop', () => {
  it('resolves a plain word to its text utility (legacy behavior intact)', () => {
    expect(tokenPropsToClasses({ color: 'primary' })).toBe('text-primary');
    expect(tokenPropsToClasses({ color: 'accent' })).toBe('text-accent');
    expect(tokenPropsToClasses({ color: 'accent-foreground' })).toBe('text-accent-foreground');
    expect(tokenPropsToClasses({ color: 'muted-foreground' })).toBe('text-muted-foreground');
  });

  it('resolves word/alpha in text context', () => {
    expect(tokenPropsToClasses({ color: 'muted/50' })).toBe('text-muted/50');
  });

  it('resolves word-to-word as gradient text with bg-clip-text (v4 utilities)', () => {
    expect(tokenPropsToClasses({ color: 'primary-to-primary/0' })).toBe(
      'bg-linear-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('combines a gradient signature with other typography props', () => {
    expect(
      tokenPropsToClasses({
        size: '4xl',
        weight: 'bold',
        color: 'primary-to-primary/0',
      }),
    ).toBe(
      'text-4xl font-bold bg-linear-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });
});
