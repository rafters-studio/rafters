/**
 * Unit tests for sliderStylesheet()
 *
 * Verifies selector composition, token usage (--motion-duration-* /
 * --motion-ease-* only), graceful fallback on unknown variant/size/orientation
 * values, and reduced-motion wrapping.
 */

import { describe, expect, it } from 'vitest';
import {
  type SliderOrientation,
  type SliderSize,
  type SliderVariant,
  sliderContainerBase,
  sliderRangeBase,
  sliderSizeStyles,
  sliderStylesheet,
  sliderThumbBase,
  sliderThumbFocusVisible,
  sliderTrackBase,
  sliderVariantColorToken,
  sliderVariantRingToken,
  sliderVariantStyles,
  sliderVerticalSizeStyles,
} from './slider.styles';

describe('sliderStylesheet', () => {
  it('emits a :host rule with display: block', () => {
    expect(sliderStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*block/);
  });

  it('emits the .container rule with flex and touch-action: none', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.container\s*\{/);
    expect(css).toContain('display: flex');
    expect(css).toContain('touch-action: none');
    expect(css).toContain('user-select: none');
  });

  it('emits .container[data-disabled] with opacity and pointer-events:none', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.container\[data-disabled\]\s*\{/);
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('pointer-events: none');
  });

  it('emits .track rule with muted background via tokenVar', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.track\s*\{/);
    expect(css).toContain('background-color: var(--color-muted)');
    expect(css).toContain('border-radius: 9999px');
  });

  it('emits .range rule with variant-aware background', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.range\s*\{/);
    expect(css).toContain('background-color: var(--color-primary)');
  });

  it('emits .thumb rule with variant border and background', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.thumb\s*\{/);
    expect(css).toContain('border-color: var(--color-primary)');
    expect(css).toContain('background-color: var(--color-background)');
  });

  it('emits .thumb:hover with scale transform', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.thumb:hover\s*\{[^}]*transform:\s*scale\(1\.1\)/);
  });

  it('emits .thumb:active with scale transform', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.thumb:active\s*\{[^}]*transform:\s*scale\(1\.05\)/);
  });

  it('emits .thumb:focus-visible with outline and token-driven ring', () => {
    const css = sliderStylesheet();
    expect(css).toMatch(/\.thumb:focus-visible\s*\{/);
    expect(css).toContain('outline: none');
    expect(css).toContain('var(--color-primary-ring)');
  });

  it('emits thumb focus-visible with token-driven ring', () => {
    expect(sliderStylesheet()).toContain('var(--color-ring)');
  });

  it('switches focus ring token by variant', () => {
    expect(sliderStylesheet({ variant: 'destructive' })).toMatch(
      /\.thumb:focus-visible\s*\{[^}]*var\(--color-destructive-ring\)/,
    );
    expect(sliderStylesheet({ variant: 'success' })).toMatch(
      /\.thumb:focus-visible\s*\{[^}]*var\(--color-success-ring\)/,
    );
    expect(sliderStylesheet({ variant: 'warning' })).toMatch(
      /\.thumb:focus-visible\s*\{[^}]*var\(--color-warning-ring\)/,
    );
  });

  it('variant overrides range background via the cascade', () => {
    const css = sliderStylesheet({ variant: 'destructive' });
    expect(css).toContain('background-color: var(--color-destructive)');
    const successCss = sliderStylesheet({ variant: 'success' });
    expect(successCss).toContain('background-color: var(--color-success)');
  });

  it('variant overrides thumb border via the cascade', () => {
    const css = sliderStylesheet({ variant: 'destructive' });
    expect(css).toMatch(/\.thumb\s*\{[^}]*border-color:\s*var\(--color-destructive\)/);
  });

  it('uses --motion-duration-* not --duration-*', () => {
    const css = sliderStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-fast)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('falls back to defaults on unknown values', () => {
    expect(() =>
      sliderStylesheet({
        variant: 'nope' as never,
        size: 'huge' as never,
        orientation: 'diagonal' as never,
      }),
    ).not.toThrow();
  });

  it('falls back to default variant when variant is unknown', () => {
    const css = sliderStylesheet({ variant: 'nope' as never });
    expect(css).toContain('var(--color-primary)');
  });

  it('falls back to default size when size is unknown', () => {
    const css = sliderStylesheet({ size: 'huge' as never });
    expect(css).toContain('height: 0.5rem');
  });

  it('falls back to horizontal when orientation is unknown', () => {
    const css = sliderStylesheet({ orientation: 'diagonal' as never });
    expect(css).toContain('flex-direction: row');
  });

  it('applies horizontal orientation container flex-direction: row', () => {
    const css = sliderStylesheet({ orientation: 'horizontal' });
    expect(css).toContain('flex-direction: row');
    expect(css).toContain('width: 100%');
  });

  it('applies vertical orientation container flex-direction: column', () => {
    const css = sliderStylesheet({ orientation: 'vertical' });
    expect(css).toContain('flex-direction: column');
    expect(css).toContain('height: 100%');
  });

  it('applies size track heights for sm, default, and lg horizontal', () => {
    expect(sliderStylesheet({ size: 'sm' })).toContain('height: 0.25rem');
    expect(sliderStylesheet({ size: 'default' })).toContain('height: 0.5rem');
    expect(sliderStylesheet({ size: 'lg' })).toContain('height: 0.75rem');
  });

  it('applies size thumb dimensions for sm, default, and lg', () => {
    expect(sliderStylesheet({ size: 'sm' })).toMatch(/\.thumb\s*\{[^}]*height:\s*1rem/);
    expect(sliderStylesheet({ size: 'sm' })).toMatch(/\.thumb\s*\{[^}]*width:\s*1rem/);
    expect(sliderStylesheet({ size: 'default' })).toMatch(/\.thumb\s*\{[^}]*height:\s*1\.25rem/);
    expect(sliderStylesheet({ size: 'lg' })).toMatch(/\.thumb\s*\{[^}]*height:\s*1\.5rem/);
  });

  it('swaps width/height for vertical orientation track', () => {
    const css = sliderStylesheet({ orientation: 'vertical', size: 'default' });
    expect(css).toMatch(/\.track\s*\{[^}]*width:\s*0\.5rem/);
  });

  it('emits prefers-reduced-motion guard', () => {
    const css = sliderStylesheet();
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/transition:\s*none/);
  });

  it('wraps transitions in prefers-reduced-motion', () => {
    expect(sliderStylesheet()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('emits disabled container style when disabled option is true', () => {
    const css = sliderStylesheet({ disabled: true });
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('pointer-events: none');
  });

  it('emits no raw hex or rgb literals -- tokens only', () => {
    const css = sliderStylesheet({ variant: 'destructive', size: 'lg' });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  describe('exports', () => {
    it('exposes sliderContainerBase with position:relative and flex', () => {
      expect(sliderContainerBase.position).toBe('relative');
      expect(sliderContainerBase.display).toBe('flex');
      expect(sliderContainerBase['touch-action']).toBe('none');
      expect(sliderContainerBase['user-select']).toBe('none');
      expect(sliderContainerBase['align-items']).toBe('center');
    });

    it('exposes sliderTrackBase with muted background token', () => {
      expect(sliderTrackBase.position).toBe('relative');
      expect(sliderTrackBase['flex-grow']).toBe('1');
      expect(sliderTrackBase.overflow).toBe('hidden');
      expect(sliderTrackBase['border-radius']).toBe('9999px');
      expect(sliderTrackBase['background-color']).toBe('var(--color-muted)');
    });

    it('exposes sliderRangeBase with primary background token', () => {
      expect(sliderRangeBase.position).toBe('absolute');
      expect(sliderRangeBase['background-color']).toBe('var(--color-primary)');
    });

    it('exposes sliderThumbBase with cursor:grab and token-driven values', () => {
      expect(sliderThumbBase.position).toBe('absolute');
      expect(sliderThumbBase.display).toBe('block');
      expect(sliderThumbBase['border-radius']).toBe('9999px');
      expect(sliderThumbBase['border-width']).toBe('2px');
      expect(sliderThumbBase['border-style']).toBe('solid');
      expect(sliderThumbBase['border-color']).toBe('var(--color-primary)');
      expect(sliderThumbBase['background-color']).toBe('var(--color-background)');
      expect(sliderThumbBase.cursor).toBe('grab');
    });

    it('exposes sliderThumbFocusVisible with outline:none and ring token', () => {
      expect(sliderThumbFocusVisible.outline).toBe('none');
      expect(sliderThumbFocusVisible['box-shadow']).toContain('var(--color-ring)');
    });

    it('exposes a variant style map for every documented variant', () => {
      const variants: ReadonlyArray<SliderVariant> = [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'accent',
      ];
      for (const v of variants) {
        expect(sliderVariantStyles[v]).toBeDefined();
        expect(sliderVariantStyles[v].range).toBeDefined();
        expect(sliderVariantStyles[v].thumb).toBeDefined();
        expect(sliderVariantStyles[v].ring).toBeDefined();
        expect(sliderVariantColorToken[v]).toBeDefined();
        expect(sliderVariantRingToken[v]).toBeDefined();
      }
    });

    it('exposes a size style map for every documented size', () => {
      const sizes: ReadonlyArray<SliderSize> = ['sm', 'default', 'lg'];
      for (const s of sizes) {
        expect(sliderSizeStyles[s]).toBeDefined();
        expect(sliderSizeStyles[s].track).toBeDefined();
        expect(sliderSizeStyles[s].thumb).toBeDefined();
        expect(sliderVerticalSizeStyles[s]).toBeDefined();
      }
    });

    it('default variant color token aliases color-primary', () => {
      expect(sliderVariantColorToken.default).toBe('color-primary');
      expect(sliderVariantRingToken.default).toBe('color-primary-ring');
    });
  });

  it('handles every documented variant without throwing', () => {
    const variants: ReadonlyArray<SliderVariant> = [
      'default',
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'accent',
    ];
    for (const variant of variants) {
      expect(() => sliderStylesheet({ variant })).not.toThrow();
    }
  });

  it('handles every documented size without throwing', () => {
    const sizes: ReadonlyArray<SliderSize> = ['sm', 'default', 'lg'];
    for (const size of sizes) {
      expect(() => sliderStylesheet({ size })).not.toThrow();
    }
  });

  it('handles every documented orientation without throwing', () => {
    const orientations: ReadonlyArray<SliderOrientation> = ['horizontal', 'vertical'];
    for (const orientation of orientations) {
      expect(() => sliderStylesheet({ orientation })).not.toThrow();
    }
  });
});
