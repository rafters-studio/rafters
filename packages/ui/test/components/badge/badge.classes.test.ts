import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import { badgeClasses, badgeVariants } from '../../../src/components/badge/badge.classes';
import type { BadgeSize, BadgeVariant } from '../../../src/components/badge/badge.behavior';

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

  it('base shape is a pill: inline-grid, centered, fully rounded', () => {
    const classes = root();
    expect(classes).toContain('inline-grid');
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

const VARIANTS: BadgeVariant[] = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
];
const SIZES: BadgeSize[] = ['sm', 'default', 'lg'];

describe('badge sizes to its content', () => {
  it('every variant and size carries w-fit', () => {
    for (const variant of VARIANTS) {
      for (const size of SIZES) {
        expect(badgeClasses({ variant, size }, {}).root).toContain('w-fit');
      }
    }
  });

  it('badgeVariants carries w-fit', () => {
    expect(badgeVariants()).toContain('w-fit');
    expect(badgeVariants({ variant: 'outline', size: 'lg' })).toContain('w-fit');
  });
});

describe('badge icons', () => {
  it('the root is a grid whose columns follow reading order, with no physical direction', () => {
    const classes = root();
    const tokens = classes.split(' ');
    for (const literal of ['inline-grid', 'grid-flow-col', 'items-center', 'gap-1']) {
      expect(tokens).toContain(literal);
    }
    expect(tokens).not.toContain('inline-flex');
    expect(classes).not.toMatch(/(^|\s)(p[lr]|m[lr]|left|right|float)-/);
  });

  it('the icon wrapper only places and hides, never sizes', () => {
    const { startIcon, endIcon } = badgeClasses({}, {});
    expect(startIcon).toBe('inline-grid place-items-center');
    expect(endIcon).toBe('inline-grid place-items-center');
  });

  it('padding tightens per side with logical classes on every size', () => {
    for (const size of SIZES) {
      const classes = root('default', size);
      expect(classes).toMatch(/has-data-\[icon=inline-start\]:ps-/);
      expect(classes).toMatch(/has-data-\[icon=inline-end\]:pe-/);
    }
  });

  it('classy keeps every new literal', () => {
    for (const size of SIZES) {
      const set = badgeClasses({ size }, {});
      const kept = classy(set.root).split(' ');
      const added = set.root
        .split(' ')
        .filter((c) => c.includes('has-data-') || c === 'inline-grid' || c === 'grid-flow-col');
      expect(added.length).toBeGreaterThan(2);
      for (const literal of added) {
        expect(kept, `classy dropped ${literal}`).toContain(literal);
      }
      expect(classy(set.startIcon)).toBe(set.startIcon);
      expect(classy(set.endIcon)).toBe(set.endIcon);
    }
  });
});

/**
 * Tailwind drops a malformed candidate SILENTLY -- no warning, no rule. This
 * points the real Tailwind CLI at the real component directory and checks the
 * emitted sheet, the same way the button classes test does.
 */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('badge icon candidates compile', () => {
  it('every icon candidate became a real rule, on logical edges', async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
      mirrorPlugin,
    ]);
    const css = await registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/badge')],
    });
    const candidates = [
      ...SIZES.flatMap((size) => badgeClasses({ size }, {}).root.split(' ')),
      ...badgeClasses({}, {}).startIcon.split(' '),
    ].filter(
      (c) =>
        c.includes('data-[icon') ||
        c === 'inline-grid' ||
        c === 'grid-flow-col' ||
        c === 'place-items-center',
    );
    const missing = [...new Set(candidates)].filter((c) => !css.includes(escapeCandidate(c)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    expect(css).toMatch(/padding-inline-start/);
    expect(css).toMatch(/padding-inline-end/);
  }, 120_000);
});
