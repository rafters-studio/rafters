import { describe, expect, it } from 'vitest';
import { breadcrumb } from '../../../src/components/breadcrumb/breadcrumb.behavior';

const state = {};
const config = {};
const ids = { root: 'r' };

describe('breadcrumb parts', () => {
  it('declares a single root part -- the nav landmark is the only contract', () => {
    expect(Object.keys(breadcrumb.parts)).toEqual(['root']);
  });
});

describe('breadcrumb aria projection', () => {
  it('projects an EMPTY root -- the landmark, current page, and separators are native markup', () => {
    // The nav aria-label, the current-page aria-current, and the aria-hidden
    // separators live in each performance's markup, NOT in the score. Like
    // Card and Container, the score computes nothing.
    expect(breadcrumb.aria(state, config, ids).root).toEqual({});
  });
});

describe('breadcrumb is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(breadcrumb.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(breadcrumb.canDispatch(state, 'anything' as never, config)).toBe(true);
  });

  it('claims no keys', () => {
    expect(breadcrumb.keymap({ key: 'Enter' }, state, 'root', config)).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(breadcrumb.initialState(config)).toEqual({});
  });
});
