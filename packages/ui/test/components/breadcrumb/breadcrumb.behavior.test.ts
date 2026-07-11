import { describe, expect, it } from 'vitest';
import {
  breadcrumb,
  breadcrumbPageAttrs,
} from '../../../src/components/breadcrumb/breadcrumb.behavior';

const state = {};

describe('breadcrumb parts', () => {
  it('declares only root -- no state, no actions, no keymap', () => {
    expect(Object.keys(breadcrumb.parts)).toEqual(['root']);
    expect(breadcrumb.initialState({})).toEqual({});
    expect(breadcrumb.canDispatch(state, 'anything' as never, {})).toBe(true);
    expect(breadcrumb.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(breadcrumb.effects(state, {})).toEqual([]);
  });
});

describe('breadcrumb aria projection', () => {
  it('defaults the accessible name to "Breadcrumb"', () => {
    const aria = breadcrumb.aria(state, {}, { root: '' });
    expect(aria.root?.['aria-label']).toBe('Breadcrumb');
  });

  it('an explicit ariaLabel overrides the default', () => {
    const aria = breadcrumb.aria(state, { ariaLabel: 'You are here' }, { root: '' });
    expect(aria.root?.['aria-label']).toBe('You are here');
  });
});

describe('breadcrumb-page projection', () => {
  it('is a constant pseudo-link contract -- rendering it IS the "current" declaration', () => {
    expect(breadcrumbPageAttrs()).toEqual({
      role: 'link',
      'aria-disabled': 'true',
      'aria-current': 'page',
    });
  });
});
