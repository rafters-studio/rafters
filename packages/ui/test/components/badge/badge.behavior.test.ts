import { describe, expect, it } from 'vitest';
import { badge } from '../../../src/components/badge/badge.behavior';

describe('badge behavior (static score: nothing to subscribe to)', () => {
  it('declares exactly the root part, with no role', () => {
    expect(Object.keys(badge.parts)).toEqual(['root']);
    expect(badge.parts.root).toEqual({});
  });

  it('has no state and no actions', () => {
    expect(badge.initialState({})).toEqual({});
    expect(badge.actions).toEqual({});
  });

  it('projects no ARIA -- the label text is the entire accessible payload', () => {
    expect(badge.aria({}, {}, { root: 'r' })).toEqual({ root: {} });
  });

  it('claims no keys and declares no effects', () => {
    expect(badge.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
    expect(badge.effects({}, {})).toEqual([]);
  });

  it('canDispatch is permissive (there is nothing to gate)', () => {
    expect(badge.canDispatch({}, {} as never, {})).toBe(true);
  });

  it('declares no motion block -- statics decline Spec 04', () => {
    expect(badge.motion).toBeUndefined();
  });
});
