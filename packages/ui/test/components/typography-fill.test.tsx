import { describe, expect, it } from 'vitest';
import { tokenPropsToClasses } from '../../src/components/ui/typography.classes';

describe('tokenPropsToClasses - fill token color prop', () => {
  it('resolves color="primary" through fill registry (solid fill)', () => {
    // "primary" is both a fill token and a tailwind color name. Solid fill in
    // text context produces text-{color}, which matches legacy behavior.
    expect(tokenPropsToClasses({ color: 'primary' })).toBe('text-primary');
  });

  it('resolves color="hero" as gradient text with bg-clip-text', () => {
    expect(tokenPropsToClasses({ color: 'hero' })).toBe(
      'bg-gradient-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('falls back to text-{value} for non-fill color names', () => {
    expect(tokenPropsToClasses({ color: 'accent' })).toBe('text-accent');
    expect(tokenPropsToClasses({ color: 'accent-foreground' })).toBe('text-accent-foreground');
    expect(tokenPropsToClasses({ color: 'muted-foreground' })).toBe('text-muted-foreground');
  });

  it('combines fill gradient color with other typography props', () => {
    expect(
      tokenPropsToClasses({
        size: '4xl',
        weight: 'bold',
        color: 'hero',
      }),
    ).toBe(
      'text-4xl font-bold bg-gradient-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('handles solid fill with opacity in text context', () => {
    // "panel" has { color: neutral-800, opacity: 0.95 }
    expect(tokenPropsToClasses({ color: 'panel' })).toBe('text-neutral-800/95');
  });
});
