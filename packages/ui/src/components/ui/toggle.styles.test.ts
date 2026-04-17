import { describe, expect, it } from 'vitest';
import {
  type ToggleSize,
  type ToggleVariant,
  toggleBase,
  toggleDisabled,
  toggleFocusVisible,
  toggleSizeStyles,
  toggleStylesheet,
  toggleVariantHover,
  toggleVariantPressed,
  toggleVariantStyles,
} from './toggle.styles';

const ALL_VARIANTS: ReadonlyArray<ToggleVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'outline',
  'ghost',
];

const ALL_SIZES: ReadonlyArray<ToggleSize> = ['sm', 'default', 'lg'];

describe('toggleStylesheet', () => {
  it('returns base + default variant + default size when no options given', () => {
    const css = toggleStylesheet();
    expect(css).toContain('.toggle');
    expect(css).toContain('var(--radius-md)');
    expect(css).toContain('var(--font-size-label-large)');
    expect(css).toContain('height: 2.5rem');
  });

  it('emits :host display:inline-flex', () => {
    expect(toggleStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('uses --motion-duration-* not --duration-*', () => {
    const css = toggleStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-base)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('applies pressed styles when pressed=true', () => {
    const css = toggleStylesheet({ pressed: true, variant: 'primary' });
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('var(--color-primary-foreground)');
  });

  it('emits focus-visible ring rule', () => {
    expect(toggleStylesheet()).toMatch(/\.toggle:focus-visible\s*\{/);
  });

  it('focus-visible uses the neutral --color-ring', () => {
    const css = toggleStylesheet();
    expect(css).toMatch(/\.toggle:focus-visible\s*\{[^}]*var\(--color-ring\)/);
  });

  it('wraps transitions in prefers-reduced-motion', () => {
    expect(toggleStylesheet()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(toggleStylesheet()).toMatch(/transition:\s*none/);
  });

  it('falls back to default on unknown values', () => {
    expect(() =>
      toggleStylesheet({ variant: 'nope' as never, size: 'huge' as never }),
    ).not.toThrow();
    const css = toggleStylesheet({ variant: 'bogus' as never, size: 'huge' as never });
    expect(css).toContain('height: 2.5rem');
  });

  it('emits all 10 variants without throwing', () => {
    for (const v of ALL_VARIANTS) {
      expect(() => toggleStylesheet({ variant: v })).not.toThrow();
    }
  });

  it('emits all 3 sizes without throwing', () => {
    for (const s of ALL_SIZES) {
      expect(() => toggleStylesheet({ size: s })).not.toThrow();
    }
  });

  it('emits distinct heights per size', () => {
    expect(toggleStylesheet({ size: 'sm' })).toContain('height: 2.25rem');
    expect(toggleStylesheet({ size: 'default' })).toContain('height: 2.5rem');
    expect(toggleStylesheet({ size: 'lg' })).toContain('height: 2.75rem');
  });

  it('emits size-specific horizontal padding', () => {
    const sm = toggleStylesheet({ size: 'sm' });
    expect(sm).toContain('padding-left: 0.625rem');
    expect(sm).toContain('padding-right: 0.625rem');

    const def = toggleStylesheet({ size: 'default' });
    expect(def).toContain('padding-left: 0.75rem');
    expect(def).toContain('padding-right: 0.75rem');

    const lg = toggleStylesheet({ size: 'lg' });
    expect(lg).toContain('padding-left: 1.25rem');
    expect(lg).toContain('padding-right: 1.25rem');
  });

  it('emits a data-state="on" pressed rule for every variant', () => {
    for (const v of ALL_VARIANTS) {
      const css = toggleStylesheet({ variant: v });
      expect(css).toContain('.toggle[data-state="on"]');
    }
  });

  it('default/primary/secondary/semantic pressed colours map to own foreground', () => {
    for (const v of [
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'accent',
    ] as const) {
      const css = toggleStylesheet({ variant: v });
      expect(css).toContain(`var(--color-${v})`);
      expect(css).toContain(`var(--color-${v}-foreground)`);
    }
  });

  it('outline pressed falls back to accent pair', () => {
    const css = toggleStylesheet({ variant: 'outline' });
    expect(css).toContain('var(--color-accent)');
    expect(css).toContain('var(--color-accent-foreground)');
  });

  it('ghost pressed falls back to accent pair', () => {
    const css = toggleStylesheet({ variant: 'ghost' });
    expect(css).toContain('var(--color-accent)');
    expect(css).toContain('var(--color-accent-foreground)');
  });

  it('outline variant emits a 1px border with color-input', () => {
    const css = toggleStylesheet({ variant: 'outline' });
    expect(css).toContain('border-width: 1px');
    expect(css).toContain('border-style: solid');
    expect(css).toContain('var(--color-input)');
  });

  it('hover rule maps to color-muted for non-ghost variants', () => {
    const css = toggleStylesheet({ variant: 'primary' });
    expect(css).toMatch(
      /\.toggle:hover:not\(:disabled\)\s*\{[^}]*background-color:\s*var\(--color-muted\)/,
    );
  });

  it('ghost hover swaps to the accent pair', () => {
    const css = toggleStylesheet({ variant: 'ghost' });
    expect(css).toMatch(
      /\.toggle:hover:not\(:disabled\)\s*\{[^}]*background-color:\s*var\(--color-accent\)/,
    );
  });

  it('emits active scale(0.98) tactile feedback', () => {
    const css = toggleStylesheet();
    expect(css).toMatch(/\.toggle:active:not\(:disabled\)\s*\{[^}]*transform:\s*scale\(0\.98\)/);
  });

  it('prefers-reduced-motion neutralises the active transform too', () => {
    const css = toggleStylesheet();
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:[^{]*\{[\s\S]*transform:\s*none/);
  });

  it('applies disabled declarations when disabled=true', () => {
    const css = toggleStylesheet({ disabled: true });
    expect(css).toContain('cursor: not-allowed');
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('pointer-events: none');
  });

  it('emits a :disabled rule carrying the disabled declarations', () => {
    const css = toggleStylesheet();
    expect(css).toContain('.toggle:disabled');
    expect(css).toMatch(/\.toggle:disabled\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('never emits a raw var() that is not a CSS custom property reference', () => {
    const css = toggleStylesheet({ variant: 'primary', size: 'lg', pressed: true });
    const matches = css.match(/var\([^)]+\)/g) ?? [];
    for (const m of matches) {
      expect(m).toMatch(/var\(--/);
    }
  });

  it('never emits a raw hex colour or rgb() literal', () => {
    const css = toggleStylesheet({
      variant: 'destructive',
      size: 'lg',
      pressed: true,
      disabled: true,
    });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  describe('exports', () => {
    it('exposes toggleBase with inline-flex and cursor pointer', () => {
      expect(toggleBase).toMatchObject({
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        cursor: 'pointer',
        'background-color': 'transparent',
      });
    });

    it('exposes toggleDisabled with opacity, cursor, pointer-events', () => {
      expect(toggleDisabled).toMatchObject({
        opacity: '0.5',
        cursor: 'not-allowed',
        'pointer-events': 'none',
      });
    });

    it('exposes toggleFocusVisible with outline:none and token-driven ring', () => {
      expect(toggleFocusVisible.outline).toBe('none');
      expect(toggleFocusVisible['box-shadow']).toContain('var(--color-ring)');
    });

    it('exposes style maps covering every variant and size key', () => {
      for (const v of ALL_VARIANTS) {
        expect(toggleVariantStyles[v]).toBeDefined();
        expect(toggleVariantPressed[v]).toBeDefined();
        expect(toggleVariantHover[v]).toBeDefined();
      }
      for (const s of ALL_SIZES) {
        expect(toggleSizeStyles[s]).toBeDefined();
      }
    });
  });
});
