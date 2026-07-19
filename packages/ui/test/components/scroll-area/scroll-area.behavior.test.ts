import { describe, expect, it } from 'vitest';
import { scrollArea } from '../../../src/components/scroll-area/scroll-area.behavior';

const state = {};
const ids = { root: 'r' };

describe('scroll-area parts', () => {
  it('declares a single root part -- the scroll surface is the only contract', () => {
    expect(Object.keys(scrollArea.parts)).toEqual(['root']);
  });
});

describe('scroll-area aria projection', () => {
  it('projects an EMPTY root -- native scroll owns every semantic', () => {
    expect(scrollArea.aria(state, {}, ids).root).toEqual({});
    expect(scrollArea.aria(state, { orientation: 'horizontal' }, ids).root).toEqual({});
    expect(scrollArea.aria(state, { orientation: 'both' }, ids).root).toEqual({});
  });
});

describe('scroll-area is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(scrollArea.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(scrollArea.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys -- keyboard scrolling stays native', () => {
    expect(scrollArea.keymap({ key: 'ArrowDown' }, state, 'root', {})).toBeNull();
    expect(scrollArea.keymap({ key: 'PageDown' }, state, 'root', {})).toBeNull();
    expect(scrollArea.keymap({ key: 'Home' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(scrollArea.initialState({})).toEqual({});
  });
});
