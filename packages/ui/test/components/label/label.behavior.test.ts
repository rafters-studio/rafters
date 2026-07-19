import { describe, expect, it } from 'vitest';
import { label } from '../../../src/components/label/label.behavior';

const state = {};
const ids = { root: 'r' };

describe('label parts', () => {
  it('declares a single root part -- the label element is the only contract', () => {
    expect(Object.keys(label.parts)).toEqual(['root']);
  });
});

describe('label aria projection', () => {
  it('projects an EMPTY root -- the `for` association is native, not the score', () => {
    expect(label.aria(state, {}, ids).root).toEqual({});
    expect(label.aria(state, { variant: 'destructive' }, ids).root).toEqual({});
  });
});

describe('label is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(label.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(label.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(label.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(label.initialState({})).toEqual({});
  });
});
