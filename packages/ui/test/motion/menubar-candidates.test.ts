/**
 * menubar's motion candidates compile (#2292). The classes test pins the
 * strings; this points the REAL Tailwind CLI at the menubar directory (the
 * harness reveal-candidates.test.ts uses) and checks that every candidate the
 * content, trigger and items name became a rule, that the bare `transition`
 * utility covers the two properties the content rows move (opacity, scale) and
 * not the inset the positioning writes, and that each transition-property
 * utility sorts before the duration it pairs with -- Tailwind's `transition*`
 * utilities restate `transition-duration`, so a later one would silently put
 * the default back in place of the tier.
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
import { menubar } from '../../src/components/menubar/menubar.behavior';
import { menubarClasses } from '../../src/components/menubar/menubar.classes';

const classes = menubarClasses({}, menubar.initialState({}));

const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

let pending: Promise<string> | null = null;
const sheet = (): Promise<string> => {
  if (pending) return pending;
  pending = (async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../src/components/menubar')],
    });
  })();
  return pending;
};

/** The body of the first rule whose selector is exactly this candidate. */
const ruleBody = (css: string, candidate: string): string => {
  const selector = `${escapeCandidate(candidate)}{`;
  const at = css.indexOf(selector);
  if (at < 0) return '';
  const start = at + selector.length;
  return css.slice(start, css.indexOf('}', start));
};

describe('menubar motion candidates compile (#2292)', () => {
  it('every content, trigger and item candidate became a real rule', async () => {
    const css = await sheet();
    const candidates = [classes.content, classes.trigger, classes.item]
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);
    const missing = candidates.filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('the extent pair reads the pop member through the consumed alias', async () => {
    const css = await sheet();
    expect(css).toContain('.extent-pop{--rafters-consumed-extent:var(--rafters-extent-pop)}');
    expect(css).toContain('scale:var(--rafters-consumed-extent)');
  }, 120_000);

  it('`transition` moves opacity and scale, never the inset the positioning writes', async () => {
    const css = await sheet();
    const body = ruleBody(css, 'transition');
    const property = /transition-property:([^;]*)/.exec(body)?.[1] ?? '';
    const properties = property.split(',').map((name) => name.trim());
    expect(properties).toEqual(expect.arrayContaining(['opacity', 'scale']));
    for (const inset of ['all', 'top', 'left', 'inset']) {
      expect(properties).not.toContain(inset);
    }
  }, 120_000);

  it('each transition-property utility sorts before the duration it pairs with', async () => {
    const css = await sheet();
    const pairs: Array<[string, string]> = [
      ['transition', 'duration-fast'],
      ['transition', 'data-[state=open]:duration-moderate'],
      ['transition-colors', 'duration-fast'],
      ['transition-colors', 'duration-micro'],
    ];
    // The selector ends at the candidate: a rule body, or the attribute a
    // data-* variant appends. Never a longer candidate sharing the prefix.
    const ruleAt = (candidate: string): number => {
      const selector = escapeCandidate(candidate);
      let at = css.indexOf(selector);
      while (at >= 0 && !'{['.includes(css.charAt(at + selector.length))) {
        at = css.indexOf(selector, at + 1);
      }
      return at;
    };
    for (const [property, duration] of pairs) {
      const propertyAt = ruleAt(property);
      const durationAt = ruleAt(duration);
      expect(propertyAt, `${property} did not compile`).toBeGreaterThanOrEqual(0);
      expect(durationAt, `${duration} did not compile`).toBeGreaterThanOrEqual(0);
      expect(propertyAt, `${property} sorts after ${duration}`).toBeLessThan(durationAt);
    }
  }, 120_000);
});
