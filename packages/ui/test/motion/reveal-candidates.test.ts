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
 * hands the REAL class strings -- imported from the components, never retyped --
 * to the REAL Tailwind CLI (`registryToCompiled`, the same harness
 * packages/design-tokens/test/exporters/motion-utilities.test.ts uses) and reads
 * the emitted sheet.
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
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { hoverCardClasses } from '../../src/components/hover-card/hover-card.classes';
import { navigationMenuClasses } from '../../src/components/navigation-menu/navigation-menu.classes';
import { tooltipClasses } from '../../src/components/tooltip/tooltip.classes';

const COMPONENTS = ['tooltip', 'hover-card', 'navigation-menu'] as const;

const CONTENT_CLASSES: Record<(typeof COMPONENTS)[number], string> = {
  tooltip: tooltipClasses({}, { open: false }).content,
  'hover-card': hoverCardClasses({}, { open: false }).content,
  'navigation-menu': navigationMenuClasses({}, { active: null, pointerOpened: false }).content,
};

/** Tailwind escapes every character outside [A-Za-z0-9_-] with a backslash, so
 *  `data-[state=open]:opacity-100` is emitted as
 *  `.data-\[state\=open\]\:opacity-100`. Reconstructing the selector from the
 *  candidate is what makes "did this compile" answerable per candidate rather
 *  than per file. */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

/** The candidates reach the compiler the way they reach it in production --
 *  as the class strings the components actually hand their content element,
 *  imported here rather than retyped, so this cannot drift from them. The
 *  fixture directory is Tailwind's `@source`, mirroring
 *  packages/design-tokens/test/exporters/motion-utilities.test.ts. */
let fixtureDir: string | undefined;

afterAll(() => {
  if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

let compiled: Promise<string> | undefined;
const sheet = (): Promise<string> => {
  compiled ??= (async () => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-hover-reveal-'));
    for (const component of COMPONENTS) {
      writeFileSync(
        join(fixtureDir, `${component}.classes.ts`),
        `export const content = '${CONTENT_CLASSES[component]}';\n`,
      );
    }
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, { contentSources: [fixtureDir] });
  })();
  return compiled;
};

describe('the hover-reveal candidates compile (#2148)', () => {
  it.each(COMPONENTS)(
    '%s: every content candidate became a real rule',
    async (component) => {
      const css = await sheet();
      const missing = CONTENT_CLASSES[component]
        .split(' ')
        .filter(Boolean)
        .filter((candidate) => !css.includes(escapeCandidate(candidate)));
      expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    },
    120_000,
  );

  it('the arbitrary variants desugar to the selectors they were written for', async () => {
    const css = await sheet();
    // Not "a rule exists" but "THIS rule exists": the reveal is a root-level
    // :hover the pointer can travel into, narrowed to the trigger by :has()
    // when the content is declared un-hoverable.
    for (const marker of ['data-tooltip', 'data-hover-card']) {
      expect(css, `${marker} reveal selector missing`).toContain(
        `:is([${marker}]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[${marker}]:not([data-disable-hoverable-content=true]):hover)>`,
      );
      expect(css, `${marker} dismissal is not important`).toMatch(
        new RegExp(`\\[${marker}\\]\\[data-dismissed=true\\]>[^{]*\\{opacity:0%?!important`),
      );
    }
    // navigation-menu's reveal is the ITEM's, through Tailwind's own named-group
    // emission, and its dismissal is the PANEL's own attribute.
    expect(css).toContain(':where(.group\\/navigation-item):hover');
    expect(css).toContain(':where(.group\\/navigation-item):focus-within');
    expect(css, 'the panel-scoped dismissal did not compile').toMatch(
      /\[data-dismissed="?true"?\][^{]*\{opacity:0%?!important/,
    );
  }, 120_000);

  it('pointer-events is transitioned discretely, never switched by the reveal', async () => {
    const css = await sheet();
    expect(css).toContain('transition-property:opacity,pointer-events');
    expect(css).toContain('transition-behavior:allow-discrete');
  }, 120_000);

  it('every transition-property utility still sorts BEFORE its duration', async () => {
    // The silent-drift guard described in the header. Read off the compiled
    // sheet, because Tailwind's sort order is the only thing that decides it.
    const css = await sheet();
    const pairs: Array<[string, string]> = [
      ['transition-[opacity,pointer-events]', 'duration-fast'],
    ];
    for (const classes of Object.values(CONTENT_CLASSES)) {
      for (const candidate of classes.split(' ')) {
        if (!candidate.endsWith(':transition-opacity')) continue;
        const prefix = candidate.slice(0, -'transition-opacity'.length);
        pairs.push([candidate, `${prefix}duration-moderate`]);
      }
    }
    expect(pairs.length, 'no transition-property utilities found to check').toBeGreaterThan(3);
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
  }, 120_000);
});
