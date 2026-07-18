import { describe, expect, it } from 'vitest';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';

const state = {};
const ids = { root: 'r' };

describe('skeleton parts', () => {
  it('declares a single root part -- the placeholder is the only contract', () => {
    expect(Object.keys(skeleton.parts)).toEqual(['root']);
  });
});

describe('skeleton aria projection', () => {
  it('projects a CONSTANT aria-hidden=true -- the placeholder is decorative', () => {
    expect(skeleton.aria(state, {}, ids).root).toEqual({ 'aria-hidden': 'true' });
  });

  it('ignores ids -- the projection never depends on rendered ids', () => {
    expect(skeleton.aria(state, {}, { root: '' }).root).toEqual({ 'aria-hidden': 'true' });
  });
});

describe('skeleton is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(skeleton.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(skeleton.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys -- a decorative placeholder has no keyboard contract', () => {
    expect(skeleton.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(skeleton.keymap({ key: 'Tab' }, state, 'root', {})).toBeNull();
  });

  it('has no effects -- nothing to perform, so nothing to bind', () => {
    expect(skeleton.effects(state, {})).toEqual([]);
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(skeleton.initialState({})).toEqual({});
  });
});
