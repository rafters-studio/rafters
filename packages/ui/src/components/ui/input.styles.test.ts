import { describe, expect, it } from 'vitest';
import {
  type InputSize,
  type InputVariant,
  inputBase,
  inputDisabled,
  inputFocusVisible,
  inputPlaceholder,
  inputSizeStyles,
  inputStylesheet,
  inputUserInvalid,
  inputVariantBorderToken,
  inputVariantRingToken,
  inputVariantStyles,
} from './input.styles';

describe('inputStylesheet', () => {
  it('emits :host display:block', () => {
    const css = inputStylesheet();
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*block/);
  });

  it('emits .input rule with token-driven border', () => {
    expect(inputStylesheet()).toContain('border-color: var(--color-input)');
  });

  it('uses tokenVar for radius and background', () => {
    const css = inputStylesheet();
    expect(css).toContain('border-radius: var(--radius-md)');
    expect(css).toContain('background-color: var(--color-background)');
  });

  it('uses motion-duration and motion-ease tokens', () => {
    const css = inputStylesheet();
    expect(css).toContain('var(--motion-duration-fast)');
    expect(css).toContain('var(--motion-ease-standard)');
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('emits placeholder, disabled, focus-visible, and user-invalid rules', () => {
    const css = inputStylesheet();
    expect(css).toMatch(/\.input::placeholder\s*\{[^}]*color:\s*var\(--color-muted-foreground\)/);
    expect(css).toMatch(/\.input:disabled\s*\{[^}]*opacity:\s*0\.5/);
    expect(css).toMatch(/\.input:focus-visible\s*\{[^}]*box-shadow:[^}]*var\(--color-/);
    expect(css).toMatch(/\.input:user-invalid\s*\{[^}]*border-color:\s*var\(--color-destructive\)/);
  });

  it('default variant uses primary-ring as the focus ring token', () => {
    const css = inputStylesheet();
    expect(css).toMatch(/\.input:focus-visible\s*\{[^}]*var\(--color-primary-ring\)/);
  });

  it('switches focus ring token by variant', () => {
    expect(inputStylesheet({ variant: 'destructive' })).toMatch(
      /\.input:focus-visible\s*\{[^}]*var\(--color-destructive-ring\)/,
    );
    expect(inputStylesheet({ variant: 'success' })).toMatch(
      /\.input:focus-visible\s*\{[^}]*var\(--color-success-ring\)/,
    );
    expect(inputStylesheet({ variant: 'warning' })).toMatch(
      /\.input:focus-visible\s*\{[^}]*var\(--color-warning-ring\)/,
    );
  });

  it('variant overrides border-color via the cascade', () => {
    const css = inputStylesheet({ variant: 'destructive' });
    expect(css).toContain('border-color: var(--color-destructive)');
    const successCss = inputStylesheet({ variant: 'success' });
    expect(successCss).toContain('border-color: var(--color-success)');
  });

  it('default variant override resolves border to color-primary', () => {
    const css = inputStylesheet();
    expect(css).toContain('border-color: var(--color-primary)');
  });

  it('muted variant resolves border to color-input alias', () => {
    const css = inputStylesheet({ variant: 'muted' });
    // Both occurrences of color-input border are valid -- the base rule and the
    // muted variant override both reference color-input.
    expect(css).toContain('border-color: var(--color-input)');
    expect(css).toMatch(/\.input:focus-visible\s*\{[^}]*var\(--color-ring\)/);
  });

  it('falls back to default variant and size for unknown keys', () => {
    const css = inputStylesheet({ variant: 'bogus' as never, size: 'huge' as never });
    expect(css).toContain('border-color: var(--color-primary)');
    expect(css).toContain('height: 2.5rem');
  });

  it('applies size dimensions per token', () => {
    const sm = inputStylesheet({ size: 'sm' });
    const lg = inputStylesheet({ size: 'lg' });
    expect(sm).toContain('height: 2rem');
    expect(sm).toContain('var(--font-size-label-small)');
    expect(lg).toContain('height: 3rem');
    expect(lg).toContain('var(--font-size-body-medium)');
  });

  it('default size uses 2.5rem height and body-small font token', () => {
    const css = inputStylesheet();
    expect(css).toContain('height: 2.5rem');
    expect(css).toContain('var(--font-size-body-small)');
  });

  it('emits prefers-reduced-motion guard', () => {
    const css = inputStylesheet();
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/transition:\s*none/);
  });

  it('user-invalid switches focus ring to destructive-ring', () => {
    const css = inputStylesheet();
    expect(css).toMatch(
      /\.input:user-invalid\s*\{[^}]*box-shadow:[^}]*var\(--color-destructive-ring\)/,
    );
  });

  it('emits no raw hex or rgb literals -- tokens only', () => {
    const css = inputStylesheet({ variant: 'destructive', size: 'lg' });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  describe('exports', () => {
    it('exposes inputBase as a CSSProperties map with token-driven values', () => {
      expect(inputBase['border-color']).toBe('var(--color-input)');
      expect(inputBase['background-color']).toBe('var(--color-background)');
      expect(inputBase['border-radius']).toBe('var(--radius-md)');
      expect(inputBase.color).toBe('var(--color-foreground)');
    });

    it('exposes inputPlaceholder, inputDisabled, inputFocusVisible, inputUserInvalid', () => {
      expect(inputPlaceholder.color).toBe('var(--color-muted-foreground)');
      expect(inputDisabled.cursor).toBe('not-allowed');
      expect(inputDisabled.opacity).toBe('0.5');
      expect(inputFocusVisible.outline).toBe('none');
      expect(inputUserInvalid['border-color']).toBe('var(--color-destructive)');
    });

    it('exposes a variant style map for every documented variant', () => {
      const variants: ReadonlyArray<InputVariant> = [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'muted',
        'accent',
      ];
      for (const v of variants) {
        expect(inputVariantStyles[v]).toBeDefined();
        expect(inputVariantBorderToken[v]).toBeDefined();
        expect(inputVariantRingToken[v]).toBeDefined();
      }
    });

    it('exposes a size style map for every documented size', () => {
      const sizes: ReadonlyArray<InputSize> = ['sm', 'default', 'lg'];
      for (const s of sizes) {
        expect(inputSizeStyles[s]).toBeDefined();
      }
    });

    it('default variant border token aliases color-primary', () => {
      expect(inputVariantBorderToken.default).toBe('color-primary');
      expect(inputVariantRingToken.default).toBe('color-primary-ring');
    });

    it('muted variant border token aliases color-input', () => {
      expect(inputVariantBorderToken.muted).toBe('color-input');
      expect(inputVariantRingToken.muted).toBe('color-ring');
    });
  });

  it('handles every documented variant without throwing', () => {
    const variants: ReadonlyArray<InputVariant> = [
      'default',
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'muted',
      'accent',
    ];
    for (const variant of variants) {
      expect(() => inputStylesheet({ variant })).not.toThrow();
    }
  });

  it('handles every documented size without throwing', () => {
    const sizes: ReadonlyArray<InputSize> = ['sm', 'default', 'lg'];
    for (const size of sizes) {
      expect(() => inputStylesheet({ size })).not.toThrow();
    }
  });
});
