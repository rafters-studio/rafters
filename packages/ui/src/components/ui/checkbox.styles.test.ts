import { describe, expect, it } from 'vitest';
import {
  type CheckboxSize,
  type CheckboxVariant,
  checkboxBase,
  checkboxDisabled,
  checkboxSizeStyles,
  checkboxStylesheet,
  checkboxVariantChecked,
  checkboxVariantFocusRing,
  checkboxVariantStyles,
} from './checkbox.styles';

const ALL_VARIANTS: ReadonlyArray<CheckboxVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];

const ALL_SIZES: ReadonlyArray<CheckboxSize> = ['sm', 'default', 'lg'];

describe('checkboxStylesheet', () => {
  it('returns base + default variant + default size when no options given', () => {
    const css = checkboxStylesheet();
    expect(css).toContain('.checkbox');
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('height: 1rem');
    expect(css).toContain('width: 1rem');
  });

  it('emits :host display:inline-flex', () => {
    expect(checkboxStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('uses --motion-duration-* not --duration-*', () => {
    const css = checkboxStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-fast)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('emits focus-visible ring per variant', () => {
    expect(checkboxStylesheet({ variant: 'destructive' })).toContain(
      'var(--color-destructive-ring)',
    );
  });

  it('falls back to default on unknown variant/size', () => {
    expect(() =>
      checkboxStylesheet({
        variant: 'bogus' as never,
        size: 'huge' as never,
      }),
    ).not.toThrow();
    const css = checkboxStylesheet({
      variant: 'bogus' as never,
      size: 'huge' as never,
    });
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('height: 1rem');
  });

  it('wraps transitions in prefers-reduced-motion', () => {
    expect(checkboxStylesheet()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(checkboxStylesheet()).toContain('transition: none');
  });

  it('emits all 8 variants without throwing', () => {
    for (const v of ALL_VARIANTS) {
      expect(() => checkboxStylesheet({ variant: v })).not.toThrow();
    }
  });

  it('emits all 3 sizes without throwing', () => {
    for (const s of ALL_SIZES) {
      expect(() => checkboxStylesheet({ size: s })).not.toThrow();
    }
  });

  it('emits an attribute-driven checked rule with the variant fill', () => {
    const css = checkboxStylesheet({ variant: 'success' });
    expect(css).toContain('.checkbox[data-state="checked"]');
    expect(css).toContain('var(--color-success)');
    expect(css).toContain('var(--color-success-foreground)');
  });

  it('emits a disabled rule that carries the disabled declarations', () => {
    const css = checkboxStylesheet({ disabled: true });
    expect(css).toContain('.checkbox:disabled');
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('cursor: not-allowed');
    expect(css).toContain('pointer-events: none');
  });

  it('emits icon size rule per size', () => {
    const sm = checkboxStylesheet({ size: 'sm' });
    expect(sm).toContain('.checkbox .icon');
    expect(sm).toContain('height: 0.625rem');

    const lg = checkboxStylesheet({ size: 'lg' });
    expect(lg).toContain('.checkbox .icon');
    expect(lg).toContain('height: 1rem');
  });

  it('emits distinct box heights per size', () => {
    expect(checkboxStylesheet({ size: 'sm' })).toContain('height: 0.875rem');
    expect(checkboxStylesheet({ size: 'default' })).toContain('height: 1rem');
    expect(checkboxStylesheet({ size: 'lg' })).toContain('height: 1.25rem');
  });

  it('never emits a raw hex colour or rgb() literal', () => {
    const css = checkboxStylesheet({
      variant: 'destructive',
      size: 'lg',
      disabled: true,
      checked: true,
    });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  it('never emits a raw var() that is not a CSS custom property reference', () => {
    const css = checkboxStylesheet({ variant: 'primary', size: 'lg' });
    const matches = css.match(/var\([^)]+\)/g) ?? [];
    for (const m of matches) {
      expect(m).toMatch(/var\(--/);
    }
  });

  it('exports checkboxBase with inline-flex and cursor pointer', () => {
    expect(checkboxBase).toMatchObject({
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      cursor: 'pointer',
    });
  });

  it('exports checkboxDisabled with opacity, cursor, and pointer-events', () => {
    expect(checkboxDisabled).toMatchObject({
      opacity: '0.5',
      cursor: 'not-allowed',
      'pointer-events': 'none',
    });
  });

  it('exports style maps covering every variant/size key', () => {
    for (const v of ALL_VARIANTS) {
      expect(checkboxVariantStyles[v]).toBeDefined();
      expect(checkboxVariantChecked[v]).toBeDefined();
      expect(checkboxVariantFocusRing[v]).toBeDefined();
    }
    for (const s of ALL_SIZES) {
      expect(checkboxSizeStyles[s]).toBeDefined();
      expect(checkboxSizeStyles[s].box).toBeDefined();
      expect(checkboxSizeStyles[s].icon).toBeDefined();
    }
  });

  it('default variant aliases color-primary in both border and checked fill', () => {
    const css = checkboxStylesheet({ variant: 'default' });
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('var(--color-primary-foreground)');
    expect(css).toContain('var(--color-primary-ring)');
  });

  it('emits border-style: solid and border-width: 1px for the base rule', () => {
    const css = checkboxStylesheet();
    expect(css).toContain('border-width: 1px');
    expect(css).toContain('border-style: solid');
  });

  it('emits transparent initial background on the base rule', () => {
    const css = checkboxStylesheet();
    expect(css).toContain('background-color: transparent');
  });
});
