import { describe, expect, it } from 'vitest';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';

const state = {};

describe('skeleton parts', () => {
  it('declares exactly one part: root', () => {
    expect(Object.keys(skeleton.parts)).toEqual(['root']);
  });
});

describe('skeleton aria projection', () => {
  it('is always aria-hidden -- decoration, never content, regardless of config', () => {
    const withoutVariant = skeleton.aria(state, {}, { root: 'r' });
    expect(withoutVariant.root?.['aria-hidden']).toBe('true');

    const withVariant = skeleton.aria(state, { variant: 'destructive' }, { root: 'r' });
    expect(withVariant.root?.['aria-hidden']).toBe('true');
  });

  it('projects no role -- a skeleton is not a status region', () => {
    const aria = skeleton.aria(state, {}, { root: 'r' });
    expect(aria.root?.role).toBeUndefined();
  });
});

describe('skeleton dispatch surface', () => {
  it('has no actions, no keymap, no effects -- a pure static', () => {
    expect(Object.keys(skeleton.actions)).toEqual([]);
    expect(skeleton.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(skeleton.effects(state, {})).toEqual([]);
  });
});
