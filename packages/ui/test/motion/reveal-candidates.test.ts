/**
 * The MISSING half of the #2148 motion contract: that the `.classes.ts`
 * candidates compile to anything at all.
 *
 * `test/motion/hover-reveal.e2e.ts` drives desugared rules in a real browser and
 * the three `*.classes.test.ts` files pin the candidate strings, and BOTH pass
 * identically whether or not Tailwind emits a single byte for those candidates
 * -- Tailwind drops a malformed candidate silently, with no warning and no rule.
 * These are unusually long arbitrary variants full of nested `:is()` / `:has()`
 * and commas, which is exactly the shape that fails that way. So this file
 * points the REAL Tailwind CLI (`registryToCompiled`, the same harness
 * packages/design-tokens/test/exporters/motion-utilities.test.ts uses) at the
 * REAL component directories, reads the emitted sheet, and checks it against the
 * class strings the components hand their content element -- imported, never
 * retyped, so the expectation cannot drift from the thing it describes.
 *
 * Two properties, and the second is the one a substring check would miss:
 *  1. every candidate in the three content class strings became a rule;
 *  2. the rules land in an order that preserves the cell. Tailwind's own
 *     `transition-*` utilities re-state `transition-duration` from
 *     `var(--tw-duration, <default>)`, and this repo's generated `duration-*`
 *     utilities do NOT set `--tw-duration` -- they set the longhand from the
 *     token. Same specificity, so the LATER rule wins: if a transition-property
 *     utility ever sorted after its duration, the open cell would silently
 *     collapse onto Tailwind's 150ms default with every test still green.
 *
 * One honest limit, and it is not a hole: Tailwind extracts candidates from the
 * WHOLE file, comments included, so a utility named in the prose above a class
 * string survives a break in the string itself. That is equally true of the
 * consumer's sheet -- their Tailwind scans the same installed file, comments and
 * all -- so the verdict here is the verdict there.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { contextMenuClasses } from '../../src/components/context-menu/context-menu.classes';
import { hoverCardClasses } from '../../src/components/hover-card/hover-card.classes';
import { navigationMenuClasses } from '../../src/components/navigation-menu/navigation-menu.classes';
import { tooltipClasses } from '../../src/components/tooltip/tooltip.classes';

const COMPONENTS = ['tooltip', 'hover-card', 'navigation-menu', 'context-menu'] as const;

const CONTENT_CLASSES: Record<(typeof COMPONENTS)[number], string> = {
  tooltip: tooltipClasses({}, { open: false }).content,
  'hover-card': hoverCardClasses({}, { open: false }).content,
  'navigation-menu': navigationMenuClasses({}, { active: null, pointerOpened: false }).content,
  // context-menu's REVEALED part is subContent (#2152), not content -- content
  // (the parent right-click panel) is out of scope, unconverted since #2017.
  'context-menu': contextMenuClasses({}, { open: false, x: 0, y: 0 }).subContent,
};

/** Tailwind escapes every character outside [A-Za-z0-9_-] with a backslash, so
 *  `data-[state=open]:opacity-100` is emitted as
 *  `.data-\[state\=open\]\:opacity-100`. Reconstructing the selector from the
 *  candidate is what makes "did this compile" answerable per candidate rather
 *  than per file. */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

/** Tailwind scans the REAL component directories, not a fixture built from the
 *  evaluated class strings. The distinction is the whole point: a
 *  `.classes.ts` value is a chain of `'...' + '...'`, and a candidate that a
 *  `+` splits mid-token exists in the runtime string while existing NOWHERE in
 *  the source Tailwind actually reads. Compiling the runtime string would pass
 *  over exactly that bug.
 *
 *  `import.meta.dirname`, not `new URL(..., import.meta.url)`: under Vite the
 *  module's url is a dev-server path, so the URL form silently resolves to
 *  `/src/components/...` and Tailwind scans nothing at all. */
const componentDir = (name: string) => resolve(import.meta.dirname, '../../src/components', name);

/** ONE SHEET PER COMPONENT, deliberately: the three share plain utilities
 *  (`opacity-0`, `duration-fast`, `transition-discrete`), so a single sheet
 *  compiled from all three directories lets one component's intact candidate
 *  stand in for another's broken one. Compiled separately, each component's
 *  sweep answers only for itself. */
const compiled = new Map<string, Promise<string>>();

const sheet = (component: string): Promise<string> => {
  const existing = compiled.get(component);
  if (existing) return existing;
  const pending = (async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, { contentSources: [componentDir(component)] });
  })();
  compiled.set(component, pending);
  return pending;
};

describe('the hover-reveal candidates compile (#2148)', () => {
  it.each(COMPONENTS)(
    '%s: every content candidate became a real rule',
    async (component) => {
      const css = await sheet(component);
      const missing = CONTENT_CLASSES[component]
        .split(' ')
        .filter(Boolean)
        .filter((candidate) => !css.includes(escapeCandidate(candidate)));
      expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    },
    120_000,
  );

  it.each([
    ['tooltip', 'data-tooltip'],
    ['hover-card', 'data-hover-card'],
  ] as const)(
    '%s: the arbitrary variants desugar to the selectors they were written for',
    async (component, marker) => {
      const css = await sheet(component);
      // Not "a rule exists" but "THIS rule exists": the reveal is a root-level
      // :hover the pointer can travel into, narrowed to the trigger by :has()
      // when the content is declared un-hoverable.
      expect(css, `${marker} reveal selector missing`).toContain(
        `:is([${marker}]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[${marker}]:not([data-disable-hoverable-content=true]):hover)>`,
      );
      expect(css, `${marker} dismissal is not important`).toMatch(
        new RegExp(`\\[${marker}\\]\\[data-dismissed=true\\]>[^{]*\\{opacity:0%?!important`),
      );
    },
    120_000,
  );

  it('context-menu: the submenu reveal selector compiles to the real sub-trigger/sub-content sibling structure (#2152)', async () => {
    // This test never calls bindContextSubMenu or bindContextMenu -- it proves
    // the CSS half of "reveals with JavaScript disabled" by checking the rule
    // Tailwind actually emits for the SSR-authored markup's sibling relationship
    // (context-menu-sub.astro: sub-trigger and sub-content are both direct
    // children of `[data-part="sub"]`), not by executing the behavior script.
    const css = await sheet('context-menu');
    expect(css, 'sub-content reveal-on-hover selector missing').toContain(
      ':is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),' +
        '[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>',
    );
    // The reveal rule and the data-state rule both carry the SAME delay -- no
    // keyboard-instant exception, unlike tooltip/hover-card (see
    // context-menu.classes.ts for why: sub-content moves at runtime, so the two
    // rules never race the way tooltip/hover-card's do).
    expect(css).toMatch(
      /data-\\\[state\\=open\\\]\\:delay-hover-intent[^{]*\{[^}]*transition-delay/,
    );
  }, 120_000);

  it('navigation-menu: the reveal is the ITEM, the dismissal is the PANEL', async () => {
    const css = await sheet('navigation-menu');
    // Tailwind's own named-group emission for the item scope...
    expect(css).toContain(':where(.group\\/navigation-item):hover');
    expect(css).toContain(':where(.group\\/navigation-item):focus-within');
    // ...and a dismissal keyed off the panel's own attribute, not a root
    // ancestor's, so one Escape cannot blank the whole bar.
    expect(css, 'the panel-scoped dismissal did not compile').toMatch(
      /\[data-dismissed="?true"?\][^{]*\{opacity:0%?!important/,
    );
    expect(css).not.toContain('[data-part=root][data-dismissed=true]');
  }, 120_000);

  it.each(COMPONENTS)(
    '%s: pointer-events is transitioned discretely, never switched by the reveal',
    async (component) => {
      const css = await sheet(component);
      expect(css).toContain('transition-property:opacity,pointer-events');
      expect(css).toContain('transition-behavior:allow-discrete');
    },
    120_000,
  );

  it.each(COMPONENTS)(
    '%s: every transition-property utility still sorts BEFORE its duration',
    async (component) => {
      // The silent-drift guard described in the header. Read off the compiled
      // sheet, because Tailwind's sort order is the only thing that decides it.
      const css = await sheet(component);
      const pairs: Array<[string, string]> = [
        ['transition-[opacity,pointer-events]', 'duration-fast'],
      ];
      for (const candidate of CONTENT_CLASSES[component].split(' ')) {
        if (!candidate.endsWith(':transition-opacity')) continue;
        const prefix = candidate.slice(0, -'transition-opacity'.length);
        pairs.push([candidate, `${prefix}duration-moderate`]);
      }
      expect(pairs.length, 'no transition-property utilities found to check').toBeGreaterThan(1);
      for (const [property, duration] of pairs) {
        const propertyAt = css.indexOf(escapeCandidate(property));
        const durationAt = css.indexOf(escapeCandidate(duration));
        expect(propertyAt, `${property} did not compile`).toBeGreaterThanOrEqual(0);
        expect(durationAt, `${duration} did not compile`).toBeGreaterThanOrEqual(0);
        expect(
          propertyAt,
          `${property} sorts after ${duration} -- the cell's tier is lost`,
        ).toBeLessThan(durationAt);
      }
    },
    120_000,
  );
});
