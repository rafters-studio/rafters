import { describe, expect, it } from 'vitest';
import { pagination } from '../../../src/components/pagination/pagination.behavior';

const state = {};
const config = {};
const ids = { root: 'r' };

describe('pagination parts', () => {
  it('declares a single root part -- the nav landmark is the only contract', () => {
    expect(Object.keys(pagination.parts)).toEqual(['root']);
  });
});

describe('pagination aria projection', () => {
  it('projects an EMPTY root -- the landmark, current page, boundaries, and ellipsis are native markup', () => {
    // The nav aria-label, the current-page aria-current, the boundary
    // aria-disabled, and the aria-hidden ellipsis live in each performance's
    // markup, NOT in the score. Like Card, Container, and Breadcrumb, the score
    // computes nothing.
    expect(pagination.aria(state, config, ids).root).toEqual({});
  });
});

describe('pagination is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(pagination.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(pagination.canDispatch(state, 'anything' as never, config)).toBe(true);
  });

  it('claims no keys', () => {
    expect(pagination.keymap({ key: 'Enter' }, state, 'root', config)).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(pagination.initialState(config)).toEqual({});
  });
});
