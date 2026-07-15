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
    expect(root('default', 'sm')).toContain('text-label-small');
    expect(root('default', 'lg')).toContain('text-label-medium');
  });

  it('base shape is a pill: inline-flex, centered, fully rounded', () => {
    const classes = root();
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('rounded-full');
  });

  it('respects prefers-reduced-motion on the color transition', () => {
    expect(root()).toContain('motion-reduce:transition-none');
  });
});
