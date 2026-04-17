import { describe, expect, it } from 'vitest';
import {
  type SwitchSize,
  type SwitchVariant,
  switchSizeStyles,
  switchStylesheet,
  switchThumbBase,
  switchTrackBase,
  switchTrackDisabled,
  switchTrackFocusVisible,
  switchVariantChecked,
  switchVariantFocusRing,
} from './switch.styles';

describe('switchStylesheet', () => {
  it('emits :host display:inline-flex', () => {
    const css = switchStylesheet();
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('emits .track and .thumb rules', () => {
    const css = switchStylesheet();
    expect(css).toMatch(/\.track\s*\{/);
    expect(css).toMatch(/\.thumb\s*\{/);
  });

  it('uses --motion-duration-* and --motion-ease-* tokens', () => {
    const css = switchStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-base)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('track base uses token-driven background-color', () => {
    const css = switchStylesheet();
    expect(css).toContain('background-color: var(--color-input)');
  });

  it('track base is a pill with transparent border', () => {
    const css = switchStylesheet();
    expect(css).toContain('border-radius: 9999px');
    expect(css).toContain('border-color: transparent');
    expect(css).toContain('border-width: 2px');
  });

  it('thumb uses token-driven background color', () => {
    const css = switchStylesheet();
    expect(css).toContain('background-color: var(--color-background)');
  });

  it('translates thumb when checked', () => {
    expect(switchStylesheet({ checked: true })).toMatch(/translateX/);
  });

  it('emits a checked-state rule that translates the thumb by size translate', () => {
    const defaultCss = switchStylesheet();
    const smCss = switchStylesheet({ size: 'sm' });
    const lgCss = switchStylesheet({ size: 'lg' });
    expect(defaultCss).toMatch(
      /\.track\[data-state="checked"\] \.thumb\s*\{[^}]*transform:\s*translateX\(1\.25rem\)/,
    );
    expect(smCss).toMatch(
      /\.track\[data-state="checked"\] \.thumb\s*\{[^}]*transform:\s*translateX\(1rem\)/,
    );
    expect(lgCss).toMatch(
      /\.track\[data-state="checked"\] \.thumb\s*\{[^}]*transform:\s*translateX\(1\.75rem\)/,
    );
  });

  it('emits variant-specific checked background-color on the track', () => {
    expect(switchStylesheet({ variant: 'destructive' })).toMatch(
      /\.track\[data-state="checked"\]\s*\{[^}]*background-color:\s*var\(--color-destructive\)/,
    );
    expect(switchStylesheet({ variant: 'success' })).toMatch(
      /\.track\[data-state="checked"\]\s*\{[^}]*background-color:\s*var\(--color-success\)/,
    );
  });

  it('default variant resolves checked background to color-primary', () => {
    expect(switchStylesheet()).toMatch(
      /\.track\[data-state="checked"\]\s*\{[^}]*background-color:\s*var\(--color-primary\)/,
    );
  });

  it('switches focus ring token by variant', () => {
    expect(switchStylesheet({ variant: 'destructive' })).toMatch(
      /\.track:focus-visible\s*\{[^}]*var\(--color-destructive-ring\)/,
    );
    expect(switchStylesheet({ variant: 'warning' })).toMatch(
      /\.track:focus-visible\s*\{[^}]*var\(--color-warning-ring\)/,
    );
  });

  it('default variant uses primary-ring as the focus ring token', () => {
    expect(switchStylesheet()).toMatch(
      /\.track:focus-visible\s*\{[^}]*var\(--color-primary-ring\)/,
    );
  });

  it('emits disabled rule with cursor and opacity', () => {
    expect(switchStylesheet()).toMatch(/\.track:disabled\s*\{[^}]*cursor:\s*not-allowed/);
    expect(switchStylesheet()).toMatch(/\.track:disabled\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('applies size dimensions per token', () => {
    const sm = switchStylesheet({ size: 'sm' });
    const dflt = switchStylesheet();
    const lg = switchStylesheet({ size: 'lg' });
    expect(sm).toContain('height: 1.25rem');
    expect(sm).toContain('width: 2.25rem');
    expect(dflt).toContain('height: 1.5rem');
    expect(dflt).toContain('width: 2.75rem');
    expect(lg).toContain('height: 1.75rem');
    expect(lg).toContain('width: 3.5rem');
  });

  it('wraps transitions in prefers-reduced-motion', () => {
    expect(switchStylesheet()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(switchStylesheet()).toMatch(/transition:\s*none/);
  });

  it('falls back to default on unknown values', () => {
    expect(() =>
      switchStylesheet({ variant: 'nope' as never, size: 'huge' as never }),
    ).not.toThrow();
    const css = switchStylesheet({ variant: 'galactic' as never, size: 'enormous' as never });
    expect(css).toContain('height: 1.5rem');
    expect(css).toMatch(
      /\.track\[data-state="checked"\]\s*\{[^}]*background-color:\s*var\(--color-primary\)/,
    );
  });

  it('emits no raw hex or rgb color literals for tokens -- only the shadow rgba stays', () => {
    const css = switchStylesheet({ variant: 'destructive', size: 'lg' });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    // The thumb box-shadow is a non-token rgba -- that's allowed and isolated.
    expect(css.match(/rgb\(/g)).toBeNull();
  });

  describe('exports', () => {
    it('exposes switchTrackBase as a CSSProperties map with token-driven values', () => {
      expect(switchTrackBase['background-color']).toBe('var(--color-input)');
      expect(switchTrackBase['border-color']).toBe('transparent');
      expect(switchTrackBase['border-radius']).toBe('9999px');
    });

    it('exposes switchTrackDisabled and switchTrackFocusVisible', () => {
      expect(switchTrackDisabled.cursor).toBe('not-allowed');
      expect(switchTrackDisabled.opacity).toBe('0.5');
      expect(switchTrackFocusVisible.outline).toBe('none');
      expect(switchTrackFocusVisible['box-shadow']).toContain('var(--color-ring)');
    });

    it('exposes switchThumbBase with token background and transform transition', () => {
      expect(switchThumbBase['background-color']).toBe('var(--color-background)');
      expect(switchThumbBase.transition).toContain('var(--motion-duration-base)');
      expect(switchThumbBase.transition).toContain('var(--motion-ease-standard)');
    });

    it('exposes switchVariantChecked for every documented variant', () => {
      const variants: ReadonlyArray<SwitchVariant> = [
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
        expect(switchVariantChecked[v]['background-color']).toContain('var(--color-');
        expect(switchVariantFocusRing[v]['box-shadow']).toContain('var(--color-');
      }
    });

    it('exposes switchSizeStyles for every documented size', () => {
      const sizes: ReadonlyArray<SwitchSize> = ['sm', 'default', 'lg'];
      for (const s of sizes) {
        expect(switchSizeStyles[s].track).toBeDefined();
        expect(switchSizeStyles[s].thumb).toBeDefined();
        expect(typeof switchSizeStyles[s].translate).toBe('string');
      }
    });

    it('default variant checked aliases color-primary', () => {
      expect(switchVariantChecked.default['background-color']).toBe('var(--color-primary)');
      expect(switchVariantFocusRing.default['box-shadow']).toContain('var(--color-primary-ring)');
    });
  });

  it('handles every documented variant without throwing', () => {
    const variants: ReadonlyArray<SwitchVariant> = [
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
      expect(() => switchStylesheet({ variant })).not.toThrow();
    }
  });

  it('handles every documented size without throwing', () => {
    const sizes: ReadonlyArray<SwitchSize> = ['sm', 'default', 'lg'];
    for (const size of sizes) {
      expect(() => switchStylesheet({ size })).not.toThrow();
    }
  });
});
