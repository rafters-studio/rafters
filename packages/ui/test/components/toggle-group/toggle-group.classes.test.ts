/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts orientation drives the container layout, the default variant carries
 * the muted chrome, and each item carries the base + size + variant classes with
 * data-[state=on] pressed styling -- the same class contract all three
 * performances paint.
 */
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
import {
  toggleGroup,
  type ToggleGroupConfig,
} from '../../../src/components/toggle-group/toggle-group.behavior';
import { toggleGroupClasses } from '../../../src/components/toggle-group/toggle-group.classes';

function classesFor(config: ToggleGroupConfig) {
  return toggleGroupClasses(config, toggleGroup.initialState(config));
}

describe('toggle-group root classes', () => {
  it('the default variant carries the muted group chrome', () => {
    const root = classesFor({}).root;
    expect(root).toContain('inline-flex');
    expect(root).toContain('rounded-lg');
    expect(root).toContain('bg-muted');
    expect(root).toContain('p-1');
  });

  it('the outline variant drops the muted chrome', () => {
    const root = classesFor({ variant: 'outline' }).root;
    expect(root).not.toContain('bg-muted');
  });

  it('vertical orientation stacks the group as a column', () => {
    expect(classesFor({ orientation: 'vertical' }).root.split(/\s+/)).toContain('flex-col');
  });

  it('horizontal orientation (default) does not stack', () => {
    expect(classesFor({}).root.split(/\s+/)).not.toContain('flex-col');
  });
});

describe('toggle-group item classes', () => {
  it('the item carries the base toggle classes and the focus ring', () => {
    const item = classesFor({}).item;
    expect(item).toContain('rounded-md');
    expect(item).toContain('focus-visible:ring-ring');
    expect(item).toContain('disabled:opacity-50');
  });

  it('the default size is h-9 px-3; sm and lg override it', () => {
    expect(classesFor({}).item).toContain('h-9 px-3');
    expect(classesFor({ size: 'sm' }).item).toContain('h-8 px-2');
    expect(classesFor({ size: 'lg' }).item).toContain('h-10 px-4');
  });

  it('the default variant drives pressed styling off data-[state=on]', () => {
    const item = classesFor({}).item;
    expect(item).toContain('data-[state=on]:bg-background');
    expect(item).toContain('data-[state=on]:text-foreground');
  });

  it('the outline variant is bordered and presses to the accent', () => {
    const item = classesFor({ variant: 'outline' }).item;
    expect(item).toContain('border-input');
    expect(item).toContain('data-[state=on]:bg-accent');
    expect(item).toContain('data-[state=on]:text-accent-foreground');
  });

  it('the item consumes its state row and its press row (#2310)', () => {
    const item = classesFor({}).item;
    // item / off <-> on -- color -- duration-moderate, ease-standard
    expect(item).toContain('transition-[color,background-color,border-color,scale]');
    expect(item).toContain('duration-moderate');
    expect(item).toContain('ease-standard');
    // item / press -- zoom + color -- duration-micro, ease-spring-snappy, extent-press.
    // The hand-typed `active:scale-[0.98]` is gone: the extent is a token leaf.
    expect(item).toContain('active:extent-press');
    expect(item).toContain('active:scale-(--rafters-consumed-extent)');
    expect(item).toContain('active:duration-micro');
    expect(item).toContain('active:ease-spring-snappy');
    expect(item).not.toContain('active:scale-[0.98]');
    expect(item).not.toContain('motion-reduce:');
  });

  it('the pressed shadow snaps: toggle-group has no elevation row (#2310)', () => {
    // `data-[state=on]:shadow-sm` is a moment the matrix does not claim -- only
    // button and card carry elevation cells. `transition-all` used to time it by
    // accident; naming the properties leaves it instant, which is what a moment
    // with no row is supposed to do.
    const item = classesFor({}).item;
    expect(item).toContain('data-[state=on]:shadow-sm');
    expect(item).not.toContain('transition-all');
    expect(item).not.toContain('box-shadow');
  });
});

describe('toggle-group icon classes', () => {
  const sizes = ['default', 'sm', 'lg'] as const;

  it('the item is a grid whose columns follow reading order, with no physical direction', () => {
    for (const size of sizes) {
      const { item } = classesFor({ size });
      const tokens = item.split(' ');
      for (const literal of ['inline-grid', 'grid-flow-col', 'items-center', 'gap-2']) {
        expect(tokens).toContain(literal);
      }
      expect(tokens).not.toContain('inline-flex');
      expect(item).not.toMatch(/(^|\s)(p[lr]|m[lr]|left|right|float)-/);
    }
  });

  it('the icon wrapper only places and hides, never sizes', () => {
    const { startIcon, endIcon } = classesFor({});
    expect(startIcon).toBe('inline-grid place-items-center');
    expect(endIcon).toBe('inline-grid place-items-center');
  });

  it('padding tightens per side with logical classes on every size', () => {
    for (const size of sizes) {
      const { item } = classesFor({ size });
      expect(item).toMatch(/has-data-\[icon=inline-start\]:ps-/);
      expect(item).toMatch(/has-data-\[icon=inline-end\]:pe-/);
    }
  });

  it('classy keeps every new literal', () => {
    for (const size of sizes) {
      const set = classesFor({ size });
      const kept = classy(set.item).split(' ');
      const added = set.item
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
 * Tailwind drops a malformed candidate SILENTLY, so this points the real
 * Tailwind CLI at the component directory and checks the emitted sheet.
 */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('toggle-group icon candidates compile', () => {
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
      contentSources: [resolve(import.meta.dirname, '../../../src/components/toggle-group')],
    });
    const candidates = [
      ...(['default', 'sm', 'lg'] as const).flatMap((size) => classesFor({ size }).item.split(' ')),
      ...classesFor({}).startIcon.split(' '),
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
