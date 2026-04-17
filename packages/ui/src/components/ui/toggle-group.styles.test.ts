/**
 * Unit tests for toggle-group.styles.ts.
 *
 * Verifies that the assembled stylesheets emit token-driven declarations,
 * never leak `--duration-*`/`--ease-*` variables, and accept unknown
 * inputs without throwing (silent fallback).
 */

import { describe, expect, it } from 'vitest';
import {
  type ToggleGroupOrientation,
  type ToggleGroupSize,
  type ToggleGroupVariant,
  toggleGroupBase,
  toggleGroupDefaultVariantStyles,
  toggleGroupItemBase,
  toggleGroupItemDefaultPressed,
  toggleGroupItemDisabled,
  toggleGroupItemFocusVisible,
  toggleGroupItemOutlinePressed,
  toggleGroupItemSizeStyles,
  toggleGroupItemStylesheet,
  toggleGroupStylesheet,
} from './toggle-group.styles';

describe('toggleGroupStylesheet', () => {
  it('emits :host with display inline-flex', () => {
    const css = toggleGroupStylesheet();
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('emits .group with token-driven radius', () => {
    const css = toggleGroupStylesheet();
    expect(css).toContain('border-radius: var(--radius-lg)');
  });

  it('applies default variant padding and muted background only for default variant', () => {
    const defaultCss = toggleGroupStylesheet({ variant: 'default' });
    expect(defaultCss).toContain('var(--color-muted)');
    expect(defaultCss).toContain('var(--spacing-1)');

    const outlineCss = toggleGroupStylesheet({ variant: 'outline' });
    expect(outlineCss).not.toContain('var(--color-muted)');
  });

  it('sets flex-direction column for vertical orientation', () => {
    const css = toggleGroupStylesheet({ orientation: 'vertical' });
    expect(css).toMatch(/flex-direction:\s*column/);
  });

  it('defaults to horizontal flex-direction for unknown orientation', () => {
    const css = toggleGroupStylesheet({
      orientation: 'diagonal' as unknown as ToggleGroupOrientation,
    });
    expect(css).toMatch(/flex-direction:\s*row/);
    expect(() =>
      toggleGroupStylesheet({ orientation: 'diagonal' as unknown as ToggleGroupOrientation }),
    ).not.toThrow();
  });

  it('silently falls back to default variant for unknown variant', () => {
    expect(() =>
      toggleGroupStylesheet({ variant: 'neon' as unknown as ToggleGroupVariant }),
    ).not.toThrow();
    const css = toggleGroupStylesheet({ variant: 'neon' as unknown as ToggleGroupVariant });
    expect(css).toContain('var(--color-muted)');
  });

  it('exposes toggleGroupBase and toggleGroupDefaultVariantStyles maps with token refs', () => {
    expect(toggleGroupBase['border-radius']).toBe('var(--radius-lg)');
    expect(toggleGroupDefaultVariantStyles['background-color']).toBe('var(--color-muted)');
    expect(toggleGroupDefaultVariantStyles.padding).toBe('var(--spacing-1)');
  });
});

describe('toggleGroupItemStylesheet', () => {
  it('emits :host with display inline-flex', () => {
    const css = toggleGroupItemStylesheet();
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('uses --motion-duration-* and --motion-ease-*, never --duration-* or --ease-*', () => {
    const css = toggleGroupItemStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-base)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('emits pressed rule with token-driven background for default variant', () => {
    const css = toggleGroupItemStylesheet({ variant: 'default', pressed: true });
    expect(css).toContain('var(--color-background)');
    expect(css).toContain('var(--color-foreground)');
  });

  it('emits pressed rule with accent colours for outline variant', () => {
    const css = toggleGroupItemStylesheet({ variant: 'outline', pressed: true });
    expect(css).toContain('var(--color-accent)');
    expect(css).toContain('var(--color-accent-foreground)');
  });

  it('emits data-state="on" pressed selector for the default variant', () => {
    const css = toggleGroupItemStylesheet({ variant: 'default' });
    expect(css).toMatch(/\.item\[data-state="on"\]\s*\{[^}]*var\(--color-background\)/);
  });

  it('emits data-state="on" pressed selector for the outline variant', () => {
    const css = toggleGroupItemStylesheet({ variant: 'outline' });
    expect(css).toMatch(/\.item\[data-state="on"\]\s*\{[^}]*var\(--color-accent\)/);
  });

  it('emits focus-visible rule with token-driven box-shadow', () => {
    const css = toggleGroupItemStylesheet();
    expect(css).toMatch(/\.item:focus-visible\s*\{[^}]*box-shadow:[^}]*var\(--color-/);
    expect(css).toContain('var(--color-ring)');
    expect(css).toContain('var(--color-background)');
  });

  it('wraps transitions in prefers-reduced-motion guard', () => {
    const css = toggleGroupItemStylesheet();
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('emits disabled rule with reduced opacity', () => {
    const css = toggleGroupItemStylesheet();
    expect(css).toMatch(/\.item:disabled\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('layers disabled declarations when disabled flag is true', () => {
    const css = toggleGroupItemStylesheet({ disabled: true });
    expect(css).toMatch(/\.item\s*\{[^}]*pointer-events:\s*none/);
  });

  it('silently falls back to default for unknown variant', () => {
    expect(() =>
      toggleGroupItemStylesheet({ variant: 'rainbow' as unknown as ToggleGroupVariant }),
    ).not.toThrow();
    const css = toggleGroupItemStylesheet({
      variant: 'rainbow' as unknown as ToggleGroupVariant,
      pressed: true,
    });
    expect(css).toContain('var(--color-background)');
  });

  it('silently falls back to default for unknown size', () => {
    expect(() =>
      toggleGroupItemStylesheet({ size: 'huge' as unknown as ToggleGroupSize }),
    ).not.toThrow();
    const css = toggleGroupItemStylesheet({ size: 'huge' as unknown as ToggleGroupSize });
    expect(css).toContain('height: 2.25rem');
  });

  it('emits per-size heights', () => {
    expect(toggleGroupItemStylesheet({ size: 'sm' })).toContain('height: 2rem');
    expect(toggleGroupItemStylesheet({ size: 'default' })).toContain('height: 2.25rem');
    expect(toggleGroupItemStylesheet({ size: 'lg' })).toContain('height: 2.5rem');
  });

  it('exposes item style maps', () => {
    expect(toggleGroupItemBase['border-radius']).toBe('var(--radius-md)');
    expect(toggleGroupItemFocusVisible.outline).toBe('none');
    expect(toggleGroupItemDisabled.opacity).toBe('0.5');
    expect(toggleGroupItemDefaultPressed['background-color']).toBe('var(--color-background)');
    expect(toggleGroupItemOutlinePressed['background-color']).toBe('var(--color-accent)');
    expect(toggleGroupItemSizeStyles.sm.height).toBe('2rem');
  });
});
