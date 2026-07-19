import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  dialog,
  isOpen,
  type DialogConfig,
  type DialogPart,
} from '../../../src/components/dialog/dialog.behavior';

const ids: PartIds<DialogPart> = {
  trigger: 't',
  content: 'c',
  overlay: 'o',
  title: 'ti',
  description: 'd',
  close: 'x',
};

const closed: DialogConfig = {};
const openUncontrolled: DialogConfig = { defaultOpen: true };

function ariaAt(config: DialogConfig, partIds: PartIds<DialogPart> = ids) {
  return dialog.aria(dialog.initialState(config), config, partIds);
}

describe('dialog parts', () => {
  it('declares the full surface', () => {
    expect(Object.keys(dialog.parts).sort()).toEqual([
      'close',
      'content',
      'description',
      'overlay',
      'title',
      'trigger',
    ]);
    expect(dialog.parts.content.optional).toBe(true);
    expect(dialog.parts.trigger.optional).toBeUndefined();
  });
});

describe('dialog state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(dialog.initialState({ defaultOpen: true }).open).toBe(true);
    expect(dialog.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    const state = dialog.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('dialog canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = dialog.initialState(closed);
    expect(dialog.canDispatch(state, 'open', closed)).toBe(true);
    expect(dialog.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(dialog.canDispatch(openState, 'open', closed)).toBe(false);
    expect(dialog.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(dialog.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(dialog.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('dialog actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(dialog, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('dialog aria projection', () => {
  it('closed: trigger collapsed, no dangling aria-controls', () => {
    const aria = ariaAt(closed);
    expect(aria.trigger).toEqual({
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
  });

  it('content: role dialog, modal by default, labelled and described', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.content).toEqual({
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'ti',
      'aria-describedby': 'd',
      'data-state': 'open',
    });
  });

  it('non-modal drops aria-modal', () => {
    const aria = ariaAt({ ...openUncontrolled, modal: false });
    expect(aria.content?.['aria-modal']).toBeUndefined();
  });

  it('empty part ids project ABSENT references, never dangling ones', () => {
    const aria = ariaAt(openUncontrolled, { ...ids, title: '', description: '' });
    expect(aria.content?.['aria-labelledby']).toBeUndefined();
    expect(aria.content?.['aria-describedby']).toBeUndefined();
  });

  it('overlay is presentation only', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.overlay).toEqual({ 'aria-hidden': 'true', 'data-state': 'open' });
  });

  it('close carries its accessible name', () => {
    expect(ariaAt(openUncontrolled).close).toEqual({ 'aria-label': 'Close' });
  });
});

describe('dialog keymap', () => {
  const state = { open: true };
  it('Escape on content maps to close', () => {
    expect(dialog.keymap({ key: 'Escape' }, state, 'content')).toBe('close');
  });
  it('Escape elsewhere and other keys are not claimed', () => {
    expect(dialog.keymap({ key: 'Escape' }, state, 'trigger')).toBeNull();
    expect(dialog.keymap({ key: 'Enter' }, state, 'content')).toBeNull();
  });
});

// The modal overlay trio (focus-trap, scroll-lock, trigger-spared outside
// dismissal) is no longer a declarative effect-spec on the score; the bindings
// compose the primitives directly. The BEHAVIOR is asserted end to end in the
// conformance suites (dialog.conformance.test.tsx / .astro. / .element.).
