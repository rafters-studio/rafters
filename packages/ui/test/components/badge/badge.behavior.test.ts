import { describe, expect, it } from 'vitest';
import { badge } from '../../../src/components/badge/badge.behavior';

describe('badge behavior (static score: nothing to subscribe to)', () => {
  it('declares the root with no role, and the two icon wrappers as optional parts', () => {
    expect(Object.keys(badge.parts)).toEqual(['root', 'startIcon', 'endIcon']);
    expect(badge.parts.root).toEqual({});
    expect(badge.parts.startIcon).toEqual({ optional: true });
    expect(badge.parts.endIcon).toEqual({ optional: true });
  });

  it('has no state and no actions', () => {
    expect(badge.initialState({})).toEqual({});
    expect(badge.actions).toEqual({});
  });

  it('projects no ARIA on the root -- the label text is the entire accessible payload', () => {
    expect(badge.aria({}, {}, { root: 'r', startIcon: 's', endIcon: 'e' }).root).toEqual({});
  });

  it('projects aria-hidden on each icon wrapper so the label alone is the name', () => {
    const aria = badge.aria({}, {}, { root: 'r', startIcon: 's', endIcon: 'e' });
    expect(aria.startIcon).toEqual({ 'aria-hidden': 'true' });
    expect(aria.endIcon).toEqual({ 'aria-hidden': 'true' });
  });

  it('claims no keys', () => {
    expect(badge.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });

  it('canDispatch is permissive (there is nothing to gate)', () => {
    expect(badge.canDispatch({}, {} as never, {})).toBe(true);
  });

  it('declares no motion block -- statics decline Spec 04', () => {
    expect(badge.motion).toBeUndefined();
  });
});
