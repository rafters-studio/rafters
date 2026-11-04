import { afterEach, describe, expect, it, vi } from 'vitest';
import * as classyModule from '../../src/primitives/classy';
import defaultClassy, { type ClassInput, classy } from '../../src/primitives/classy';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('classy - basic merging', () => {
  it('merges strings, arrays and objects', () => {
    const out = classy('btn', ['px-4', { hidden: false }], { active: true });
    expect(out).toBe('btn px-4 active');
  });

  it('deduplicates preserving order', () => {
    const out = classy('a b', 'b c', ['a', 'd']);
    expect(out).toBe('a b c d');
  });

  it('passes layout utilities through', () => {
    expect(classy('flex', 'gap-4', 'p-4', 'bg-primary')).toBe('flex gap-4 p-4 bg-primary');
  });

  it('keeps grid-cols-menu-row', () => {
    expect(classy('grid grid-cols-menu-row')).toBe('grid grid-cols-menu-row');
  });
});

// @criterion-1
describe('classy only combines', () => {
  const examples: Array<{ inputs: ClassInput[]; output: string }> = [
    { inputs: ['a b', 'b c'], output: 'a b c' },
    { inputs: ['a', false, null, undefined, ['b', 'c']], output: 'a b c' },
    { inputs: [{ a: true, b: false }], output: 'a' },
    { inputs: ['p-2', 'p-4'], output: 'p-2 p-4' },
    {
      inputs: ['w-[3px]', 'md:transition-[width]'],
      output: 'w-[3px] md:transition-[width]',
    },
  ];

  for (const nodeEnv of ['development', 'production']) {
    for (const { inputs, output } of examples) {
      it(`${nodeEnv}: returns "${output}" with no warning`, () => {
        vi.stubEnv('NODE_ENV', nodeEnv);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(classy(...inputs)).toBe(output);
        expect(warn).not.toHaveBeenCalled();
      });
    }
  }
});

describe('classy exports', () => {
  it('exports only classy, as default and by name', () => {
    expect(Object.keys(classyModule).sort()).toEqual(['classy', 'default']);
    expect(defaultClassy).toBe(classy);
  });

  it('carries no create, token, parse or hasArbitrary', () => {
    for (const name of ['create', 'token', 'parse', 'hasArbitrary']) {
      expect(classy).not.toHaveProperty(name);
    }
  });
});
