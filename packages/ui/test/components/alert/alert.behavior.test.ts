import { describe, expect, it } from 'vitest';
import { alert } from '../../../src/components/alert/alert.behavior';

const state = {};
const ids = { root: 'r' };

describe('alert parts', () => {
  it('declares a single root part', () => {
    expect(Object.keys(alert.parts)).toEqual(['root']);
  });
});

describe('alert aria projection', () => {
  it('projects role=alert unconditionally, independent of config', () => {
    expect(alert.aria(state, {}, ids).root?.role).toBe('alert');
    expect(alert.aria(state, { variant: 'destructive' }, ids).root?.role).toBe('alert');
  });
});

describe('alert has no dynamic behavior', () => {
  it('has no actions', () => {
    expect(Object.keys(alert.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(alert.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(alert.keymap({ key: 'Escape' }, state, 'root', {})).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(alert.initialState({})).toEqual({});
  });
});
