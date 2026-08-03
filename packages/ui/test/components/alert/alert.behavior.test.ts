import { describe, expect, it } from 'vitest';
import { alert } from '../../../src/components/alert/alert.behavior';
import type { AriaRole } from '../../../src/lib/contract';

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

  // The annotation is the assertion: it does not compile if the projected role
  // widens back to a bare string, which is what forced the cast in #2002.
  it('projects role as an AriaRole, so performances paint it without casting', () => {
    const role: AriaRole | undefined = alert.aria(state, {}, ids).root?.role;
    expect(role).toBe('alert');
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
