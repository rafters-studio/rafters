/**
 * The classes projection: literal selection, never construction.
 */
import { describe, expect, it } from 'vitest';
import {
  buttonBaseClasses,
  buttonClasses,
  buttonSizeClasses,
  buttonSpinnerClasses,
  buttonVariantClasses,
  buttonVariants,
} from '../../../src/components/button/button.classes';
import type { ButtonConfig } from '../../../src/components/button/button.behavior';

const VARIANTS = Object.keys(buttonVariantClasses) as Array<ButtonConfig['variant']>;
const SIZES = Object.keys(buttonSizeClasses) as Array<ButtonConfig['size']>;

describe('buttonClasses', () => {
  it('root is exactly base + variant + size literals for every combination', () => {
    for (const variant of VARIANTS) {
      for (const size of SIZES) {
        const { root } = buttonClasses({ variant, size });
        expect(root).toBe(
          `${buttonBaseClasses} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]}`,
        );
      }
    }
  });

  it('spinner classes are the shared literal', () => {
    expect(buttonClasses({ variant: 'default', size: 'default' }).spinner).toBe(
      buttonSpinnerClasses,
    );
  });

  it('covers the shadcn superset: 12 variants, 8 sizes', () => {
    expect(VARIANTS).toHaveLength(12);
    expect(SIZES).toHaveLength(8);
    for (const shadcnVariant of [
      'default',
      'secondary',
      'destructive',
      'outline',
      'ghost',
      'link',
    ]) {
      expect(VARIANTS).toContain(shadcnVariant);
    }
    for (const shadcnSize of ['default', 'sm', 'lg', 'icon']) {
      expect(SIZES).toContain(shadcnSize);
    }
  });

  it('oracle corrections hold: no pointer-events-none, soft-disabled styled via aria-disabled variant', () => {
    expect(buttonBaseClasses).not.toContain('pointer-events-none');
    expect(buttonBaseClasses).toContain('aria-disabled:opacity-50');
    expect(buttonBaseClasses).toContain('disabled:opacity-50');
  });

  it('uses semantic tokens only -- no named colors, no arbitrary values', () => {
    const all = [
      buttonBaseClasses,
      buttonSpinnerClasses,
      ...Object.values(buttonVariantClasses),
      ...Object.values(buttonSizeClasses),
    ].join(' ');
    expect(all).not.toMatch(/\[[^\]]*\]/);
    expect(all).not.toMatch(/-(red|blue|green|yellow|zinc|slate|gray|neutral|stone)-\d/);
    expect(all).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe('buttonVariants (shadcn-compatible export)', () => {
  it('defaults to variant=default size=default', () => {
    expect(buttonVariants()).toBe(buttonClasses({ variant: 'default', size: 'default' }).root);
  });

  it('is a view over the classes projection -- one source of truth', () => {
    expect(buttonVariants({ variant: 'destructive', size: 'lg' })).toBe(
      buttonClasses({ variant: 'destructive', size: 'lg' }).root,
    );
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-destructive');
  });
});
