import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  isOpen,
  popover,
  type PopoverConfig,
  type PopoverPart,
} from '../../../src/components/popover/popover.behavior';

const ids: PartIds<PopoverPart> = {
  trigger: 't',
  content: 'c',
  anchor: 'a',
  close: 'x',
};

const closed: PopoverConfig = {};
const openUncontrolled: PopoverConfig = { defaultOpen: true };

function ariaAt(config: PopoverConfig, partIds: PartIds<PopoverPart> = ids) {
  return popover.aria(popover.initialState(config), config, partIds);
}

describe('popover parts', () => {
  it('declares trigger, content, anchor, close', () => {
    expect(Object.keys(popover.parts).sort()).toEqual(['anchor', 'close', 'content', 'trigger']);
    expect(popover.parts.content.optional).toBe(true);
    expect(popover.parts.anchor.optional).toBe(true);
    expect(popover.parts.close.optional).toBe(true);
    expect(popover.parts.trigger.optional).toBeUndefined();
  });
});

describe('popover state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(popover.initialState({ defaultOpen: true }).open).toBe(true);
    expect(popover.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    expect(isOpen({ open: false }, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('popover canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = popover.initialState(closed);
    expect(popover.canDispatch(state, 'open', closed)).toBe(true);
    expect(popover.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(popover.canDispatch(openState, 'open', closed)).toBe(false);
    expect(popover.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(popover.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(popover.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('popover actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(popover, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('popover aria projection', () => {
  it('closed: trigger collapsed, haspopup dialog, no dangling aria-controls', () => {
    expect(ariaAt(closed).trigger).toEqual({
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'data-state': 'closed',
      'aria-haspopup': 'dialog',
    });
  });

  it('open: trigger expanded and wired to content', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.trigger?.['aria-expanded']).toBe('true');
    expect(aria.trigger?.['aria-controls']).toBe('c');
    expect(aria.trigger?.['data-state']).toBe('open');
    expect(aria.trigger?.['aria-haspopup']).toBe('dialog');
  });

  it('content carries role dialog and the open axis, never data-side', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.content).toEqual({ role: 'dialog', 'data-state': 'open' });
    expect(aria.content?.['data-side']).toBeUndefined();
  });

  it('anchor and close project no aria (structure only)', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.anchor).toBeUndefined();
    expect(aria.close).toBeUndefined();
  });
});

describe('popover keymap', () => {
  const state = { open: true };
  it('Escape on content maps to close', () => {
    expect(popover.keymap({ key: 'Escape' }, state, 'content')).toBe('close');
  });
  it('Escape elsewhere and other keys are not claimed', () => {
    expect(popover.keymap({ key: 'Escape' }, state, 'trigger')).toBeNull();
    expect(popover.keymap({ key: 'Enter' }, state, 'content')).toBeNull();
  });
});

describe('popover effects (non-modal)', () => {
  it('closed: no effects', () => {
    expect(popover.effects(popover.initialState(closed), closed)).toEqual([]);
  });

  it('open: only outside-dismissal, sparing trigger AND anchor -- no trap, no scroll lock', () => {
    expect(popover.effects(popover.initialState(openUncontrolled), openUncontrolled)).toEqual([
      {
        type: 'dismiss-on-outside',
        part: 'content',
        action: 'close',
        exceptParts: ['trigger', 'anchor'],
      },
    ]);
  });

  it('controlled open drives the dismiss effect without touching intrinsic state', () => {
    const config: PopoverConfig = { open: true };
    expect(popover.effects({ open: false }, config)).toHaveLength(1);
  });
});
