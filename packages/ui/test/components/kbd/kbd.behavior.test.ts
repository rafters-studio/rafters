import { describe, expect, it } from 'vitest';
import { kbd } from '../../../src/components/kbd/kbd.behavior';

const state = {};
const ids = { root: 'r' };

describe('kbd parts', () => {
  it('declares a single root part -- the cap is the only contract', () => {
    expect(Object.keys(kbd.parts)).toEqual(['root']);
  });
});

describe('kbd aria projection', () => {
  it('projects an EMPTY root -- the <kbd> element is native semantics, like Card', () => {
    expect(kbd.aria(state, {}, ids).root).toEqual({});
  });
});

describe('kbd is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(kbd.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(kbd.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(kbd.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(kbd.initialState({})).toEqual({});
  });
});
