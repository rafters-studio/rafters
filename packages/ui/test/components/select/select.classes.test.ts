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
import { select } from '../../../src/components/select/select.behavior';
import { selectClasses } from '../../../src/components/select/select.classes';

const config = {};
const classes = selectClasses(config, select.initialState(config));

describe('select classes', () => {
  it('the listbox sits on the dropdown depth token', () => {
    expect(classes.content).toContain('z-depth-dropdown');
  });

  it('the trigger honors the touch floor and scales down via CQ', () => {
    expect(classes.trigger).toContain('h-11');
    expect(classes.trigger).toContain('@md:h-9');
    expect(classes.trigger).not.toContain('sm:');
  });

  it('state-dependent looks key off projected attributes', () => {
    expect(classes.chevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.item).toContain('data-[highlighted]:bg-accent');
    expect(classes.value).toContain('data-[empty]:text-muted-foreground');
  });

  it('content runs the two anchored-popup CELLS, not the tailwindcss-animate vocabulary', () => {
    // motion.jsonl: select / content / closed -> open (moderate, enter, extent
    // pop) and open -> closed (fast, exit, extent pop). `animate-in` /
    // `animate-out` / `fade-in-0` / `zoom-in-95` came from tailwindcss-animate,
    // which this repo does not ship, so they compiled to nothing at all.
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    for (const dead of ['animate-in', 'animate-out', 'fade-in-0', 'zoom-in-95', 'zoom-out-95']) {
      expect(classes.content).not.toContain(dead);
    }
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('the trigger carries the trigger/hover row: color, fast, standard', () => {
    // motion.jsonl: select / trigger / hover -- color, duration-fast,
    // ease-standard. box-shadow stays in the property list so the focus ring
    // keeps transitioning; `transition-duration` is per element, so both share
    // the one tier the matrix actually assigns.
    expect(classes.trigger).toContain(
      'transition-[box-shadow,color,background-color,border-color]',
    );
    expect(classes.trigger).toContain('duration-fast');
    expect(classes.trigger).toContain('ease-standard');
    expect(classes.trigger).toContain('hover:border-input-hover');
    // The ring's old `duration-micro` was an analogy borrowed from input /
    // root / focus, not an assignment, and it is gone on purpose. Restoring it
    // alongside duration-fast would put two duration longhands on one element
    // and silently retune the hover row the matrix does assign.
    expect(classes.trigger).not.toContain('duration-micro');
  });

  it('the chevron carries its rotate row: moderate, standard, structural 180deg', () => {
    expect(classes.chevron).toContain('transition-transform');
    expect(classes.chevron).toContain('duration-moderate');
    expect(classes.chevron).toContain('ease-standard');
  });

  it('items carry the highlight-move row, and the selected check swaps on the indicator', () => {
    // highlight move: color, micro, standard (proposed).
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
    // selected check: swap, micro, standard (proposed). The check glyph mounts
    // and unmounts, so the swap rides the always-present indicator box, scoped
    // to the item's own named group rather than the trigger's bare one.
    expect(classes.item).toContain('group/item');
    expect(classes.itemIndicator).toContain('opacity-0');
    expect(classes.itemIndicator).toContain('group-data-[state=checked]/item:opacity-100');
    expect(classes.itemIndicator).toContain('duration-micro');
    expect(classes.itemIndicator).toContain('ease-standard');
  });

  it('items carry the enter row: the stagger delay, no duration, no curve', () => {
    // motion.jsonl: select / items / enter assigns `delay-stagger-step` with
    // `duration: {"kind":"none"}` -- no DURATION assigned, not no assignment.
    // The delay generic is the whole row, and it resolves to 0ms at the
    // efficient intent: that zero is the assignment rather than a gap.
    expect(classes.item).toContain('delay-stagger-step');
  });

  it('no literal duration, delay or easing value appears anywhere', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(duration|delay)-\[?\d/);
      expect(value).not.toMatch(/\bease-(in|out|in-out|linear-\d)/);
    }
  });

  it('disabled looks key off the projected data-disabled and native disabled', () => {
    expect(classes.trigger).toContain('data-[disabled]:opacity-50');
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
  });

  it('reduced motion is the token sheet, never a component-level escape', () => {
    // INVERTED, not deleted. This once asserted trigger and chevron carried
    // `motion-reduce:transition-none`. They do not: the generated duration and
    // delay utilities zero themselves under prefers-reduced-motion
    // (REDUCED_MOTION_ZEROED), so a component-level media query is redundant --
    // tooltip.classes.ts states the rule. Asserting the ABSENCE means
    // reintroducing one fails rather than passing quietly.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('motion-reduce');
    }
  });
});

const PHYSICAL =
  /(^|[\s:])-?(pl|pr|ml|mr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-/;

describe('select icons and grid layout', () => {
  it('has no physical direction class anywhere', () => {
    for (const [key, value] of Object.entries(classes)) {
      expect(value, key).not.toMatch(PHYSICAL);
    }
  });

  it('the content is the menu-row grid and each row passes it down as a subgrid', () => {
    expect(classes.content.split(' ')).toContain('grid-cols-menu-row');
    for (const row of [classes.viewport, classes.group, classes.item]) {
      expect(row.split(' ')).toEqual(
        expect.arrayContaining(['col-span-full', 'grid-cols-subgrid']),
      );
    }
    expect(classes.item.split(' ')).toContain('grid');
  });

  it('the trigger is a grid; cells sit by column in reading order', () => {
    const tokens = classes.trigger.split(' ');
    expect(tokens).toContain('grid');
    expect(tokens).toContain('grid-cols-menu-row');
    expect(tokens).not.toContain('flex');
    expect(classes.triggerStartIcon).toContain('col-start-2');
    expect(classes.value).toContain('col-start-3');
    expect(classes.triggerEndIcon).toContain('col-start-4');
    expect(classes.chevron).toContain('col-start-5');
  });

  it('the wrappers only place and hide, never size', () => {
    for (const wrapper of [
      classes.startIcon,
      classes.endIcon,
      classes.triggerStartIcon,
      classes.triggerEndIcon,
    ]) {
      expect(wrapper.split(' ')).toEqual(
        expect.arrayContaining(['inline-grid', 'place-items-center']),
      );
      expect(wrapper).not.toMatch(/(^|\s)(size|w|h)-/);
    }
  });

  it('padding tightens on the icon side only, in logical classes', () => {
    for (const row of [classes.trigger, classes.item]) {
      expect(row).toMatch(/has-data-\[icon=inline-start\]:ps-/);
      expect(row).toMatch(/has-data-\[icon=inline-end\]:pe-/);
    }
  });

  it('classy keeps every new literal', () => {
    const added = (value: string) =>
      value
        .split(' ')
        .filter(
          (c) =>
            c.includes('has-data-') ||
            c.startsWith('col-') ||
            c.startsWith('grid') ||
            c === 'inline-grid' ||
            c === 'place-items-center' ||
            c === 'grid',
        );
    for (const [key, value] of Object.entries(classes)) {
      const kept = classy(value).split(' ');
      for (const literal of added(value)) {
        expect(kept, `${key}: classy dropped ${literal}`).toContain(literal);
      }
    }
  });
});

const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('select grid and icon candidates compile', () => {
  it('every layout candidate became a real rule, on logical edges', async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
      mirrorPlugin,
    ]);
    const css = await registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/select')],
    });
    const candidates = Object.values(classes)
      .flatMap((value) => value.split(' '))
      .filter(
        (c) =>
          c.includes('data-[icon') ||
          c.includes('grid') ||
          c.startsWith('col-') ||
          c === 'place-items-center' ||
          /^(ps|pe|ms|me)-/.test(c),
      );
    const missing = [...new Set(candidates)].filter((c) => !css.includes(escapeCandidate(c)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    expect(css).toMatch(/padding-inline-start/);
    expect(css).toMatch(/padding-inline-end/);
  }, 120_000);
});
