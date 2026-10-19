/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts orientation drives the root and rail layout, the trigger carries the
 * data-state contract both the pill styling and the motion intent hang off, and
 * the panel carries a focus ring because it is focusable -- the same class
 * contract all three performances paint.
 */
import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  shadowRungPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import { tabs, type TabsConfig } from '../../../src/components/tabs/tabs.behavior';
import { tabsClasses } from '../../../src/components/tabs/tabs.classes';

function classesFor(config: TabsConfig) {
  return tabsClasses(config, tabs.initialState(config));
}

describe('tabs classes', () => {
  it('the default (no orientation) stacks the rail above the panels', () => {
    expect(classesFor({}).root).toBe('flex flex-col gap-2');
  });

  it('horizontal orientation stacks the rail above the panels', () => {
    expect(classesFor({ orientation: 'horizontal' }).root).toBe('flex flex-col gap-2');
  });

  it('vertical orientation puts the rail beside the panels', () => {
    expect(classesFor({ orientation: 'vertical' }).root).toBe('flex flex-row gap-2');
  });

  it('the rail is a fixed-height row when horizontal and a column when vertical', () => {
    expect(classesFor({}).list).toContain('h-10');
    expect(classesFor({}).list).not.toContain('flex-col');
    expect(classesFor({ orientation: 'vertical' }).list).toContain('flex-col');
  });

  it('the rail carries the muted trough the active pill sits in', () => {
    const list = classesFor({}).list;
    expect(list).toContain('bg-muted');
    expect(list).toContain('rounded-md');
  });

  it('the trigger styles both data-state branches off one string', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('data-[state=active]:bg-background');
    expect(trigger).toContain('data-[state=active]:text-foreground');
    expect(trigger).toContain('data-[state=inactive]:text-muted-foreground');
  });

  it('the trigger carries the trigger/hover row: color, fast, standard', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('transition-colors');
    expect(trigger).toContain('duration-fast');
    expect(trigger).toContain('ease-standard');
  });

  it('the trigger no longer transitions the active pill shadow', () => {
    // `transition-all` also timed `shadow-sm`, and the matrix assigns tabs no
    // elevation row. A moment with no row does not move.
    expect(classesFor({}).trigger).not.toContain('transition-all');
  });

  it('the panel crossfades in on the panel/active-change cell', () => {
    // motion.jsonl tabs / panel / "active change" -- fade, fast, standard, which
    // the generator emits as animate-fade-in-fast-standard. Unconditional: only
    // the active panel loses `hidden`, and regaining a box restarts the
    // animation.
    expect(classesFor({}).panel.split(/\s+/)).toContain('animate-fade-in-fast-standard');
  });

  it('has no indicator part, so the travel row stays unconsumed', () => {
    // The active pill is the trigger's own data-[state=active]:bg-background --
    // it appears in place rather than travelling along the rail. Reported on
    // #2307 rather than faked back onto the trigger.
    const classes = classesFor({});
    expect(Object.keys(classes).sort()).toEqual([
      'endIcon',
      'list',
      'panel',
      'root',
      'startIcon',
      'trigger',
    ]);
  });

  it('the trigger carries the focus ring and the disabled treatment', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('focus-visible:ring-ring');
    expect(trigger).toContain('disabled:opacity-50');
    expect(trigger).toContain('disabled:cursor-not-allowed');
  });

  it('the panel carries a focus ring because tabpanels are focusable', () => {
    const panel = classesFor({}).panel;
    expect(panel).toContain('focus-visible:ring-ring');
    expect(panel).toContain('ring-offset-background');
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    for (const value of Object.values(classesFor({}))) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
  });
});

describe('tabs icon classes', () => {
  it('the trigger is a grid whose columns follow reading order, with no physical direction', () => {
    const { trigger } = classesFor({});
    const tokens = trigger.split(' ');
    for (const literal of ['inline-grid', 'grid-flow-col', 'items-center', 'gap-2']) {
      expect(tokens).toContain(literal);
    }
    expect(tokens).not.toContain('inline-flex');
    expect(trigger).not.toMatch(/(^|\s)(p[lr]|m[lr]|left|right|float)-/);
  });

  it('the icon wrapper only places and hides, never sizes', () => {
    const { startIcon, endIcon } = classesFor({});
    expect(startIcon).toBe('inline-grid place-items-center');
    expect(endIcon).toBe('inline-grid place-items-center');
  });

  it('padding tightens per side with logical classes', () => {
    const { trigger } = classesFor({});
    expect(trigger).toContain('has-data-[icon=inline-start]:ps-2');
    expect(trigger).toContain('has-data-[icon=inline-end]:pe-2');
  });

  it('classy keeps every new literal', () => {
    const set = classesFor({});
    const kept = classy(set.trigger).split(' ');
    const added = set.trigger
      .split(' ')
      .filter((c) => c.includes('has-data-') || c === 'inline-grid' || c === 'grid-flow-col');
    expect(added.length).toBe(4);
    for (const literal of added) {
      expect(kept, `classy dropped ${literal}`).toContain(literal);
    }
    expect(classy(set.startIcon)).toBe(set.startIcon);
    expect(classy(set.endIcon)).toBe(set.endIcon);
  });
});

const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('tabs icon candidates compile', () => {
  it('every icon candidate became a real rule, on logical edges', async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
      mirrorPlugin,
      shadowRungPlugin,
    ]);
    const css = await registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/tabs')],
    });
    const set = classesFor({});
    const candidates = [...set.trigger.split(' '), ...set.startIcon.split(' ')].filter(
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
