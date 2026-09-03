import { describe, expect, it } from 'vitest';
import { badgeClasses } from '../../../src/components/badge/badge.classes';
import type { BadgeVariant } from '../../../src/components/badge/badge.behavior';

function root(variant?: BadgeVariant, size?: 'sm' | 'default' | 'lg'): string {
  return badgeClasses({ variant, size }, {}).root;
}

describe('badge classes', () => {
  it('defaults to the primary fill and default size', () => {
    const classes = root();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
    expect(classes).toContain('px-2.5');
  });

  it('every semantic fill variant pairs bg with its token foreground', () => {
    const fills: BadgeVariant[] = [
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'muted',
      'accent',
    ];
    for (const variant of fills) {
      const classes = root(variant);
      expect(classes).toContain(`bg-${variant}`);
      expect(classes).toContain(`text-${variant}-foreground`);
    }
  });

  it('outline is transparent with a bordered token ring', () => {
    const classes = root('outline');
    expect(classes).toContain('border');
    expect(classes).toContain('border-input');
    expect(classes).toContain('bg-transparent');
  });

  it('ghost carries no resting fill, only hover state', () => {
    const classes = root('ghost');
    expect(classes).not.toContain('bg-primary');
    expect(classes).toContain('hover:bg-muted');
  });

  it('link reads as text, underlined on hover', () => {
    const classes = root('link');
    expect(classes).toContain('text-primary');
    expect(classes).toContain('hover:underline');
  });

  it('size walks the label-text scale, not raw font sizes', () => {
    expect(root('default', 'sm')).toContain('ts-label-small');
    expect(root('default', 'lg')).toContain('ts-label-medium');
  });

  it('base shape is a pill: inline-flex, centered, fully rounded', () => {
    const classes = root();
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('rounded-full');
  });

  // Reduced motion is the token sheet's job, never the component's: the
  // generated duration-* and delay-* utilities zero themselves under
  // prefers-reduced-motion (REDUCED_MOTION_ZEROED in the tailwind exporter).
  // A component-level escape fights that law, so its ABSENCE is the assertion
  // -- this is the tripwire against reintroducing one.
  it('adds no component-level reduced-motion escape', () => {
    expect(root()).not.toContain('motion-reduce:');
  });

  // `badge / root / hover`: a colour change on a part that stays put, so a
  // transition named as composed generics -- tier `fast`, curve role
  // `standard`. The `duration-150` this replaced was a literal.
  it('the hover colour transition consumes the tier and curve the matrix assigns', () => {
    const classes = root();
    expect(classes).toContain('transition-colors');
    expect(classes).toContain('duration-fast');
    expect(classes).toContain('ease-standard');
    expect(classes).not.toMatch(/duration-\d/);
  });
});
