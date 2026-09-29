// @vitest-environment happy-dom
/**
 * Compiled-CSS probe for `stagger-items` (#2189), per reflection 019f97db: run
 * the real Tailwind v4 CLI over the exporter's sheet plus a fixture that uses
 * the class, then read the compiled rules back rather than trusting the source.
 *
 * The sheet is the SHIPPED form (minified, as `rafters.standalone.css` is).
 * Minification flattens the nested `& > *` rules and rewrites `:nth-child(1)` as
 * `:first-child`, which is exactly why this reads compiled output and not the
 * exporter's string.
 *
 * Each position's delay is decided by the cascade against the rendered fixture:
 * every top-level `.stagger-items` rule whose selector the rendered `<li>`
 * matches, highest specificity winning, source order breaking ties. The token is
 * retuned to a nonzero step first -- the default is 0ms, and at zero every
 * position resolves to the same value, which would make saturation vacuous.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { beforeAll, describe, expect, it } from 'vitest';

const STEP_TOKEN = 'rafters-delay-stagger-step';
const STEP_MS = 40;
const FIXTURE = join(import.meta.dirname, 'fixtures', 'stagger-items.html');

interface CompiledRule {
  selector: string;
  delay: string;
  order: number;
}

function retunedRegistry(): TokenRegistry {
  let found = false;
  const tokens = generateBaseSystem({}).allTokens.map((t) => {
    if (t.name !== STEP_TOKEN) return t;
    found = true;
    return { ...t, value: `${STEP_MS}ms` };
  });
  if (!found) throw new Error(`no token named ${STEP_TOKEN}`);
  return new TokenRegistry(tokens, [scalePlugin, contrastPlugin, statePlugin, invertPlugin]);
}

/** Strip every `@media (...) { ... }` block, so only unconditional rules remain. */
function withoutMediaBlocks(css: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media', i);
    if (at === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    let depth = 0;
    let j = css.indexOf('{', at);
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    i = j + 1;
  }
  return out;
}

/** Every unconditional `.stagger-items ...{animation-delay:...}` rule, in source order. */
function staggerRules(css: string): CompiledRule[] {
  const rules: CompiledRule[] = [];
  const pattern = /(\.stagger-items[^{}]*)\{animation-delay:([^;}]+)\}/g;
  for (const match of withoutMediaBlocks(css).matchAll(pattern)) {
    const selector = match[1];
    const delay = match[2];
    if (selector === undefined || delay === undefined) continue;
    rules.push({ selector: selector.trim(), delay: delay.trim(), order: rules.length });
  }
  return rules;
}

/** Class and pseudo-class count -- all these selectors carry, and all the cascade needs here. */
function specificity(selector: string): number {
  return (selector.match(/[.:][\w-]+/g) ?? []).length;
}

/** The winning `animation-delay` for each rendered child, keyed by 1-based position. */
function delaysByPosition(rules: CompiledRule[]): Map<number, string> {
  const items = document.querySelectorAll('.stagger-items > li');
  const result = new Map<number, string>();
  let position = 0;
  for (const item of items) {
    position++;
    let winner: CompiledRule | undefined;
    for (const rule of rules) {
      if (!item.matches(rule.selector)) continue;
      if (
        winner === undefined ||
        specificity(rule.selector) > specificity(winner.selector) ||
        (specificity(rule.selector) === specificity(winner.selector) && rule.order > winner.order)
      ) {
        winner = rule;
      }
    }
    if (winner) result.set(position, winner.delay);
  }
  return result;
}

/** Resolve `calc(<n>*var(--rafters-delay-stagger-step))` against the compiled leaf. */
function resolveMs(delay: string, stepMs: number): number {
  const match = /^calc\((\d+)\s*\*\s*var\(--rafters-delay-stagger-step\)\)$/.exec(delay);
  if (!match?.[1]) throw new Error(`unexpected delay expression: ${delay}`);
  return Number(match[1]) * stepMs;
}

/** The leaf as compiled, in ms. Minification may write 40ms as .04s. */
function compiledStepMs(css: string): number {
  const values = [...css.matchAll(/--rafters-delay-stagger-step:\s*([\d.]+)(ms|s)/g)].map((m) =>
    m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]),
  );
  const nonzero = [...new Set(values.filter((v) => v !== 0))];
  if (nonzero.length !== 1 || nonzero[0] === undefined) {
    throw new Error(`expected one nonzero stagger-step leaf, found ${JSON.stringify(values)}`);
  }
  return nonzero[0];
}

describe('stagger-items compiles to a per-position ladder (#2189)', () => {
  let css = '';
  let delays = new Map<number, string>();

  beforeAll(async () => {
    css = await registryToCompiled(retunedRegistry(), { contentSources: [FIXTURE] });
    document.body.innerHTML = readFileSync(FIXTURE, 'utf-8');
    delays = delaysByPosition(staggerRules(css));
  }, 60_000);

  it('renders the 13-item fixture and compiles the class', () => {
    expect(document.querySelectorAll('.stagger-items > li')).toHaveLength(13);
    expect(css).toContain('.stagger-items');
    expect(compiledStepMs(css)).toBe(STEP_MS);
  });

  it('gives position 3 calc(3 * step), resolving to 3 steps', () => {
    const third = delays.get(3);
    expect(third).toBe('calc(3*var(--rafters-delay-stagger-step))');
    expect(resolveMs(third ?? '', compiledStepMs(css))).toBe(3 * STEP_MS);
  });

  it('climbs one step per position from 1 through 12', () => {
    for (let n = 1; n <= 12; n++) {
      expect(resolveMs(delays.get(n) ?? '', STEP_MS), `position ${n}`).toBe(n * STEP_MS);
    }
  });

  it('saturates position 13 at the position-12 value', () => {
    const twelfth = delays.get(12);
    const thirteenth = delays.get(13);
    expect(thirteenth).toBeDefined();
    expect(thirteenth).toBe(twelfth);
    expect(resolveMs(thirteenth ?? '', compiledStepMs(css))).toBe(12 * STEP_MS);
  });

  it('keeps the reduced-motion zero through compilation', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^@]*\.stagger-items>\*\{animation-delay:0(ms|s)?\}/,
    );
  });
});
