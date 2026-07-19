import { describe, expect, it } from 'vitest';
import { spinner } from '../../../src/components/spinner/spinner.behavior';

const state = {};
const ids = { root: 'r' };

describe('spinner parts', () => {
  it('declares a single root part -- the busy indicator is the only contract', () => {
    expect(Object.keys(spinner.parts)).toEqual(['root']);
  });

  it('declares no explicit role -- role=status is native to <output>', () => {
    expect(spinner.parts.root.role).toBeUndefined();
  });
});

describe('spinner aria projection', () => {
  it('projects a constant aria-label="Loading" -- the non-native accessible name', () => {
    expect(spinner.aria(state, {}, ids).root).toEqual({ 'aria-label': 'Loading' });
  });

  it('projects the same label regardless of size/variant config', () => {
    expect(spinner.aria(state, { size: 'lg', variant: 'destructive' }, ids).root).toEqual({
      'aria-label': 'Loading',
    });
  });

  it('ignores ids -- there are no cross-references to wire', () => {
    expect(spinner.aria(state, {}, { root: 'anything' }).root).toEqual({ 'aria-label': 'Loading' });
  });
});

describe('spinner is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(spinner.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(spinner.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(spinner.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(spinner.initialState({})).toEqual({});
  });
});
