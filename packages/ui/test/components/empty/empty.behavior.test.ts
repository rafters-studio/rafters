import { describe, expect, it } from 'vitest';
import { empty } from '../../../src/components/empty/empty.behavior';

const state = {};
const ids = { root: 'r' };

describe('empty parts', () => {
  it('declares a single root part -- the placeholder is the only contract', () => {
    expect(Object.keys(empty.parts)).toEqual(['root']);
  });
});

describe('empty aria projection', () => {
  it('projects an EMPTY root -- semantics come from the heading inside, like Card', () => {
    expect(empty.aria(state, {}, ids).root).toEqual({});
  });
});

describe('empty is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(empty.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(empty.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(empty.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('has no effects -- nothing to perform, so nothing to bind', () => {
    expect(empty.effects(state, {})).toEqual([]);
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(empty.initialState({})).toEqual({});
  });
});
