import { describe, expect, it } from 'vitest';
import { separator } from '../../../src/components/separator/separator.behavior';

const state = {};
const ids = { root: 'r' };

describe('separator parts', () => {
  it('declares a single root part with no fixed role (role is projected)', () => {
    expect(Object.keys(separator.parts)).toEqual(['root']);
    expect(separator.parts.root.role).toBeUndefined();
  });
});

describe('separator aria projection', () => {
  it('is decorative by default: role="none", no aria-orientation', () => {
    const aria = separator.aria(state, {}, ids);
    expect(aria.root?.role).toBe('none');
    expect(aria.root?.['aria-orientation']).toBeUndefined();
  });

  it('decorative=false promises the real separator role and orientation', () => {
    const aria = separator.aria(state, { decorative: false }, ids);
    expect(aria.root?.role).toBe('separator');
    expect(aria.root?.['aria-orientation']).toBe('horizontal');
  });

  it('vertical orientation carries through when non-decorative', () => {
    const aria = separator.aria(state, { decorative: false, orientation: 'vertical' }, ids);
    expect(aria.root?.role).toBe('separator');
    expect(aria.root?.['aria-orientation']).toBe('vertical');
  });

  it('decorative=true never leaks aria-orientation, even when orientation is set', () => {
    const aria = separator.aria(state, { decorative: true, orientation: 'vertical' }, ids);
    expect(aria.root?.role).toBe('none');
    expect(aria.root?.['aria-orientation']).toBeUndefined();
  });
});

describe('separator has nothing to dispatch', () => {
  it('no actions, no keymap claims, no effects', () => {
    expect(Object.keys(separator.actions)).toEqual([]);
    expect(separator.keymap({ key: 'Tab' }, state, 'root', {})).toBeNull();
    expect(separator.effects(state, {})).toEqual([]);
  });
});
