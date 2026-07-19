import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  collapsible,
  isOpen,
  type CollapsibleConfig,
  type CollapsiblePart,
} from '../../../src/components/collapsible/collapsible.behavior';

const ids: PartIds<CollapsiblePart> = {
  root: 'r',
  trigger: 't',
  content: 'c',
};

const closed: CollapsibleConfig = {};
const openUncontrolled: CollapsibleConfig = { defaultOpen: true };

function ariaAt(config: CollapsibleConfig, partIds: PartIds<CollapsiblePart> = ids) {
  return collapsible.aria(collapsible.initialState(config), config, partIds);
}

describe('collapsible parts', () => {
  it('declares the wrapper, trigger and content', () => {
    expect(Object.keys(collapsible.parts).sort()).toEqual(['content', 'root', 'trigger']);
    expect(collapsible.parts.content.optional).toBe(true);
    expect(collapsible.parts.trigger.optional).toBeUndefined();
    expect(collapsible.parts.root.optional).toBeUndefined();
  });
});

describe('collapsible state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(collapsible.initialState({ defaultOpen: true }).open).toBe(true);
    expect(collapsible.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    const state = collapsible.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('collapsible canDispatch', () => {
  it('idempotence gate: open only when closed, close only when open', () => {
    const state = collapsible.initialState(closed);
    expect(collapsible.canDispatch(state, 'open', closed)).toBe(true);
    expect(collapsible.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(collapsible.canDispatch(openState, 'open', closed)).toBe(false);
    expect(collapsible.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('disabled gate: rejects both open and close', () => {
    const disabled: CollapsibleConfig = { disabled: true };
    expect(collapsible.canDispatch({ open: false }, 'open', disabled)).toBe(false);
    expect(collapsible.canDispatch({ open: true }, 'close', disabled)).toBe(false);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(collapsible.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(collapsible.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('collapsible actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(collapsible, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });

  it('a disabled collapsible never moves', () => {
    const disabled: CollapsibleConfig = { disabled: true };
    const { memory, dispatch } = createBehavior(collapsible, disabled);
    expect(dispatch('open', disabled)).toBe(false);
    expect(memory.get().open).toBe(false);
  });
});

describe('collapsible aria projection', () => {
  it('closed: trigger collapsed, no dangling aria-controls', () => {
    const aria = ariaAt(closed);
    expect(aria.trigger).toEqual({
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'data-state': 'closed',
      'data-disabled': undefined,
    });
  });

  it('open: trigger expanded and wired to content', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.trigger?.['aria-expanded']).toBe('true');
    expect(aria.trigger?.['aria-controls']).toBe('c');
    expect(aria.trigger?.['data-state']).toBe('open');
  });

  it('root and content mirror the open axis', () => {
    expect(ariaAt(closed).root).toEqual({ 'data-state': 'closed', 'data-disabled': undefined });
    expect(ariaAt(openUncontrolled).root?.['data-state']).toBe('open');
    expect(ariaAt(closed).content?.['data-state']).toBe('closed');
    expect(ariaAt(openUncontrolled).content?.['data-state']).toBe('open');
  });

  it('disabled: data-disabled on root, trigger and content', () => {
    const aria = ariaAt({ disabled: true });
    expect(aria.root?.['data-disabled']).toBe('');
    expect(aria.trigger?.['data-disabled']).toBe('');
    expect(aria.content?.['data-disabled']).toBe('');
  });

  it('content carries no name-from-author (no aria-labelledby)', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.content?.['aria-labelledby']).toBeUndefined();
    expect(aria.content?.role).toBeUndefined();
  });
});

describe('collapsible keymap', () => {
  it('claims nothing -- the native button fulfils Enter/Space', () => {
    const state = { open: false };
    expect(collapsible.keymap({ key: 'Enter' }, state, 'trigger', closed)).toBeNull();
    expect(collapsible.keymap({ key: ' ' }, state, 'trigger', closed)).toBeNull();
    expect(collapsible.keymap({ key: 'Escape' }, state, 'content', closed)).toBeNull();
  });
});
