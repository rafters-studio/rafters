/**
 * The items' enter row reaches every item by POSITION (#2412). motion.jsonl:
 * select / items / enter assigns `delay-stagger-step`, and the viewport
 * -- the item collection's container -- selects `stagger-items` (#2189) to
 * consume it.
 *
 * Read from COMPILED CSS, not from the class string: a real Tailwind v4 compile
 * of the exporter's sheet, scanning the real select source directory,
 * then each rendered item's winning `animation-delay` decided by the cascade
 * (every unconditional `.stagger-items` rule the item matches, highest
 * specificity winning, source order breaking ties). happy-dom's
 * getComputedStyle is not used: it drops every @layer-wrapped rule, so an
 * assertion through it would pass vacuously (see the skeleton classes test).
 * Same method as apps/demo/test/motion/stagger-items-compile.test.ts.
 *
 * The menu is rendered with 13 plain items and nothing else, so a child's
 * position is its item index.
 */

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
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/select/select';

const STEP_TOKEN = 'rafters-delay-stagger-step';
const STEP_MS = 40;
const ITEM_COUNT = 13;
const SOURCE_DIR = join(import.meta.dirname, '../../../src/components/select');

interface CompiledRule {
  selector: string;
  delay: string;
  order: number;
}

function registry(stepMs: number | null): TokenRegistry {
  let found = false;
  const tokens = generateBaseSystem({}).allTokens.map((t) => {
    if (t.name !== STEP_TOKEN) return t;
    found = true;
    return stepMs === null ? t : { ...t, value: `${stepMs}ms` };
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

/** The unconditional `--rafters-delay-stagger-step` leaf as compiled, in ms. */
function compiledStepMs(css: string): number {
  const values = [
    ...withoutMediaBlocks(css).matchAll(/--rafters-delay-stagger-step:\s*([\d.]+)(ms|s)?/g),
  ].map((m) => (m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1])));
  const distinct = [...new Set(values)];
  if (distinct.length !== 1 || distinct[0] === undefined) {
    throw new Error(`expected one stagger-step leaf value, found ${JSON.stringify(values)}`);
  }
  return distinct[0];
}

/** `calc(<n>*var(--rafters-delay-stagger-step))` resolved against the compiled leaf. */
function resolveMs(delay: string, stepMs: number): number {
  const match = /^calc\((\d+)\s*\*\s*var\(--rafters-delay-stagger-step\)\)$/.exec(delay);
  if (!match?.[1]) throw new Error(`unexpected delay expression: ${delay}`);
  return Number(match[1]) * stepMs;
}

function renderedItems(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]'));
}

/** Each rendered item's winning delay, in ms, in item order. */
function itemDelaysMs(css: string): number[] {
  const rules = staggerRules(css);
  const stepMs = compiledStepMs(css);
  const delays: number[] = [];
  for (const item of renderedItems()) {
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
    if (winner === undefined) throw new Error('an item matched no stagger-items rule');
    delays.push(resolveMs(winner.delay, stepMs));
  }
  return delays;
}

function Menu() {
  const labels = Array.from({ length: ITEM_COUNT }, (_, i) => `Item ${i + 1}`);
  return (
    <Select defaultOpen>
      <SelectTrigger aria-label="Options">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent aria-label="Options">
        {labels.map((label) => (
          <SelectItem key={label} value={label}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

describe('select items enter by position through stagger-items (#2412)', () => {
  let defaultCss = '';
  let retunedCss = '';

  beforeAll(async () => {
    defaultCss = await registryToCompiled(registry(null), { contentSources: [SOURCE_DIR] });
    retunedCss = await registryToCompiled(registry(STEP_MS), { contentSources: [SOURCE_DIR] });
    document.body.innerHTML = renderToStaticMarkup(<Menu />);
  }, 60_000);

  afterAll(() => {
    document.body.innerHTML = '';
  });

  it('renders the items as direct children of a viewport that selects stagger-items', () => {
    // The DOM check, not the source scan, is what proves the component selects
    // the class: the scan would pick the name up from a comment alone.
    const content = document.body.querySelector<HTMLElement>('[data-part="content"]');
    const viewport = content?.firstElementChild;
    expect(viewport?.classList.contains('stagger-items')).toBe(true);
    const items = renderedItems();
    expect(items).toHaveLength(ITEM_COUNT);
    for (const item of items) expect(item.parentElement).toBe(viewport);
    expect(staggerRules(retunedCss).length).toBeGreaterThanOrEqual(13);
  });

  it('at the default token value every item enters with the content (0ms)', () => {
    expect(compiledStepMs(defaultCss)).toBe(0);
    expect(itemDelaysMs(defaultCss)).toEqual(Array.from({ length: ITEM_COUNT }, () => 0));
  });

  it('with a nonzero step, item N waits longer than item N-1 through 12', () => {
    expect(compiledStepMs(retunedCss)).toBe(STEP_MS);
    const delays = itemDelaysMs(retunedCss);
    for (let n = 2; n <= 12; n++) {
      const current = delays[n - 1] ?? Number.NaN;
      const previous = delays[n - 2] ?? Number.NaN;
      expect(current, `item ${n}`).toBeGreaterThan(previous);
    }
    expect(delays[0]).toBe(STEP_MS);
  });

  it('item 13 saturates at the item-12 delay', () => {
    const delays = itemDelaysMs(retunedCss);
    expect(delays[12]).toBe(delays[11]);
    expect(delays[12]).toBe(12 * STEP_MS);
  });
});
