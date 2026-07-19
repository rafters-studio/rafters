import { describe, expect, it } from 'vitest';
import {
  aspectRatio,
  DEFAULT_RATIO,
  parseRatio,
  resolveRatio,
} from '../../../src/components/aspect-ratio/aspect-ratio.behavior';

const state = {};
const ids = { root: 'r' };

describe('parseRatio', () => {
  it('passes a finite positive number straight through', () => {
    expect(parseRatio(1.5)).toBe(1.5);
    expect(parseRatio(16 / 9)).toBe(16 / 9);
  });

  it('divides a fraction string like "16/9"', () => {
    expect(parseRatio('16/9')).toBe(16 / 9);
    expect(parseRatio('4/3')).toBe(4 / 3);
  });

  it('reads a decimal or integer string', () => {
    expect(parseRatio('1.778')).toBe(1.778);
    expect(parseRatio('2')).toBe(2);
  });

  it('falls back to 1 for missing, empty, non-numeric, or non-positive input', () => {
    expect(parseRatio(null)).toBe(DEFAULT_RATIO);
    expect(parseRatio(undefined)).toBe(DEFAULT_RATIO);
    expect(parseRatio('')).toBe(DEFAULT_RATIO);
    expect(parseRatio('   ')).toBe(DEFAULT_RATIO);
    expect(parseRatio('foo')).toBe(DEFAULT_RATIO);
    expect(parseRatio(0)).toBe(DEFAULT_RATIO);
    expect(parseRatio(-2)).toBe(DEFAULT_RATIO);
    expect(parseRatio('-1')).toBe(DEFAULT_RATIO);
    expect(parseRatio('16/0')).toBe(DEFAULT_RATIO);
    expect(parseRatio(Number.NaN)).toBe(DEFAULT_RATIO);
  });
});

describe('resolveRatio', () => {
  it('defaults an absent ratio to 1', () => {
    expect(resolveRatio({})).toBe(DEFAULT_RATIO);
    expect(resolveRatio({ ratio: undefined })).toBe(DEFAULT_RATIO);
  });

  it('resolves a supplied proportion', () => {
    expect(resolveRatio({ ratio: 16 / 9 })).toBe(16 / 9);
  });

  it('normalises a non-positive proportion back to 1', () => {
    expect(resolveRatio({ ratio: 0 })).toBe(DEFAULT_RATIO);
  });
});

describe('aspect-ratio parts', () => {
  it('declares a single root part -- the box is the only contract', () => {
    expect(Object.keys(aspectRatio.parts)).toEqual(['root']);
  });
});

describe('aspect-ratio aria projection', () => {
  it('projects an EMPTY root -- the slotted content owns the semantics', () => {
    expect(aspectRatio.aria(state, {}, ids).root).toEqual({});
    expect(aspectRatio.aria(state, { ratio: 16 / 9 }, ids).root).toEqual({});
  });
});

describe('aspect-ratio is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(aspectRatio.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(aspectRatio.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(aspectRatio.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(aspectRatio.initialState({})).toEqual({});
  });
});
