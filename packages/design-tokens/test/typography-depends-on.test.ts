/**
 * line-height-* values are per-scale design choices, not derivations of
 * font-size-* (#2664): they declare no font-size dependency.
 */
import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../src/generators/index.js';

const EXPECTED_VALUES: Record<string, string> = {
  'line-height-xs': '1.5',
  'line-height-sm': '1.5',
  'line-height-base': '1.5',
  'line-height-lg': '1.5',
  'line-height-xl': '1.4',
  'line-height-2xl': '1.35',
  'line-height-3xl': '1.3',
  'line-height-4xl': '1.25',
  'line-height-5xl': '1.2',
  'line-height-6xl': '1.15',
  'line-height-7xl': '1.1',
  'line-height-8xl': '1.1',
  'line-height-9xl': '1.1',
  // Named keys (#2825): leading-none, leading-7 and leading-relaxed at the
  // values they compiled to before the registry carried them.
  'line-height-none': '1',
  'line-height-7': 'var(--rafters-spacing-7)',
  'line-height-relaxed': '1.625',
};

describe('line-height dependencies', () => {
  const tokens = generateBaseSystem().allTokens.filter((t) => t.name.startsWith('line-height-'));

  it('declares no font-size-* dependency', () => {
    expect(tokens.length).toBe(16);
    for (const t of tokens) {
      expect((t.dependsOn ?? []).some((d) => d.startsWith('font-size-'))).toBe(false);
    }
  });

  it('keeps every value unchanged', () => {
    const values = Object.fromEntries(tokens.map((t) => [t.name, t.value]));
    expect(values).toEqual(EXPECTED_VALUES);
  });
});
