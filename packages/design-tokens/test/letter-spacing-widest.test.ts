/**
 * The shortcut composite's named tracking is a token (#2768): the base system
 * carries letter-spacing-widest, and both the CSS and the DTCG export
 * reference it instead of resolving NAMED_TRACKING.widest to a literal.
 */
import { describe, expect, it } from 'vitest';
import { toDTCG } from '../src/exporters/dtcg.js';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import { generateBaseSystem } from '../src/generators/index.js';

type Node = Record<string, unknown>;
const isObj = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);

function nodeAt(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split('.')) {
    if (!isObj(cur) || !(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

describe('letter-spacing-widest', () => {
  const { allTokens } = generateBaseSystem();

  it('is a base-system token with value 0.1em', () => {
    const token = allTokens.find((t) => t.name === 'letter-spacing-widest');
    expect(token?.value).toBe('0.1em');
  });

  it('is referenced by the shortcut CSS and resolves to 0.1em as before', () => {
    const css = tokensToTailwind(allTokens);
    expect(css).toContain('--text-shortcut--letter-spacing: var(--letter-spacing-widest);');
    expect(css).toContain('--letter-spacing-widest: 0.1em;');
  });

  it('is referenced by the shortcut DTCG letterSpacing, not a literal', () => {
    const dtcg = toDTCG(allTokens);
    const shortcut = findToken(dtcg, 'shortcut');
    const value = isObj(shortcut) ? shortcut.$value : undefined;
    const letterSpacing = isObj(value) ? value.letterSpacing : undefined;
    expect(letterSpacing).toBe('{letter.spacing.widest}');
    const target = nodeAt(dtcg, 'letter.spacing.widest');
    expect(isObj(target) ? target.$value : undefined).toEqual({ value: 0.0694, unit: 'rem' });
  });
});

/** Depth-first search for the token keyed `name`. */
function findToken(node: unknown, name: string): unknown {
  if (!isObj(node)) return undefined;
  for (const [k, v] of Object.entries(node)) {
    if (k === name && isObj(v) && '$value' in v) return v;
    const found = findToken(v, name);
    if (found !== undefined) return found;
  }
  return undefined;
}
