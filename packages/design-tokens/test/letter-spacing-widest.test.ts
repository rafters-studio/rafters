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
    expect(css).toContain('--text-shortcut--letter-spacing: var(--rafters-letter-spacing-widest);');
    expect(css).toContain('--rafters-letter-spacing-widest: 0.1em;');
  });

  it('is referenced by the shortcut DTCG letterSpacing, not a literal', () => {
    const { light } = toDTCG(allTokens);
    const letterSpacing = nodeAt(light, 'shortcut.letterSpacing');
    expect(isObj(letterSpacing) ? letterSpacing.$value : undefined).toBe('{letter.spacing.widest}');
    const target = nodeAt(light, 'letter.spacing.widest');
    expect(isObj(target) ? target.$value : undefined).toEqual({ value: 1.1104, unit: 'px' });
    expect(nodeAt(target, '$extensions.rafters.value')).toEqual({ value: 0.0694, unit: 'rem' });
  });
});
