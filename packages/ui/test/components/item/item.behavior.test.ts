import { describe, expect, it } from 'vitest';
import { item, parseItemSize } from '../../../src/components/item/item.behavior';

const state = {};
const ids = { root: 'r' };

describe('item parts', () => {
  it('declares a single root part -- the row is the only contract', () => {
    expect(Object.keys(item.parts)).toEqual(['root']);
  });
});

describe('item aria projection', () => {
  it('projects role=option with aria-selected=false and tabindex 0 by default', () => {
    const root = item.aria(state, {}, ids).root;
    expect(root.role).toBe('option');
    expect(root['aria-selected']).toBe('false');
    expect(root.tabindex).toBe('0');
    // Not-true states are absent, never rendered as an attribute.
    expect(root['aria-disabled']).toBeUndefined();
    expect(root['data-selected']).toBeUndefined();
    expect(root['data-disabled']).toBeUndefined();
  });

  it('selected projects aria-selected=true and the data-selected hook', () => {
    const root = item.aria(state, { selected: true }, ids).root;
    expect(root['aria-selected']).toBe('true');
    expect(root['data-selected']).toBe('');
    // Selection does not touch the tab order.
    expect(root.tabindex).toBe('0');
  });

  it('disabled projects aria-disabled, the data-disabled hook, and tabindex -1', () => {
    const root = item.aria(state, { disabled: true }, ids).root;
    expect(root['aria-disabled']).toBe('true');
    expect(root['data-disabled']).toBe('');
    expect(root.tabindex).toBe('-1');
    // aria-selected is still projected -- an option always carries its state.
    expect(root['aria-selected']).toBe('false');
  });

  it('selected and disabled compose independently', () => {
    const root = item.aria(state, { selected: true, disabled: true }, ids).root;
    expect(root['aria-selected']).toBe('true');
    expect(root['data-selected']).toBe('');
    expect(root['aria-disabled']).toBe('true');
    expect(root['data-disabled']).toBe('');
    expect(root.tabindex).toBe('-1');
  });
});

describe('item size coercion', () => {
  it('accepts the known sizes', () => {
    expect(parseItemSize('sm')).toBe('sm');
    expect(parseItemSize('lg')).toBe('lg');
    expect(parseItemSize('default')).toBe('default');
  });

  it('falls back to default for unknown or missing values', () => {
    expect(parseItemSize('huge')).toBe('default');
    expect(parseItemSize(null)).toBe('default');
    expect(parseItemSize(undefined)).toBe('default');
  });
});

describe('item is a static score -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(item.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(item.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys -- activation belongs to the listbox/menu parent', () => {
    expect(item.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
    expect(item.keymap({ key: ' ' }, state, 'root', {})).toBeNull();
  });

  it('has no effects -- nothing to perform, so nothing to bind', () => {
    expect(item.effects(state, {})).toEqual([]);
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(item.initialState({})).toEqual({});
  });
});
