import { describe, expect, it } from 'vitest';
import { card } from '../../../src/components/card/card.behavior';

const state = {};
const ids = { root: 'r' };

describe('card parts', () => {
  it('declares a single root part -- the surface is the only contract', () => {
    expect(Object.keys(card.parts)).toEqual(['root']);
  });
});

describe('card aria projection', () => {
  it('projects an EMPTY root -- semantics are native to the element, like Container', () => {
    expect(card.aria(state, {}, ids).root).toEqual({});
    expect(card.aria(state, { as: 'article', fill: 'primary' }, ids).root).toEqual({});
  });
});

describe('card is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(card.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(card.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(card.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(card.initialState({})).toEqual({});
  });
});
