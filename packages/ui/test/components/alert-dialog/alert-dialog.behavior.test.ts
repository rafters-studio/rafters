import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  alertDialog,
  isOpen,
  type AlertDialogConfig,
  type AlertDialogPart,
} from '../../../src/components/alert-dialog/alert-dialog.behavior';

const ids: PartIds<AlertDialogPart> = {
  trigger: 't',
  content: 'c',
  overlay: 'o',
  title: 'ti',
  description: 'd',
  cancel: 'ca',
  action: 'ac',
};

const closed: AlertDialogConfig = {};
const openUncontrolled: AlertDialogConfig = { defaultOpen: true };

function ariaAt(config: AlertDialogConfig, partIds: PartIds<AlertDialogPart> = ids) {
  return alertDialog.aria(alertDialog.initialState(config), config, partIds);
}

describe('alert-dialog parts', () => {
  it('declares the full surface with cancel/action and no close', () => {
    expect(Object.keys(alertDialog.parts).sort()).toEqual([
      'action',
      'cancel',
      'content',
      'description',
      'overlay',
      'title',
      'trigger',
    ]);
    expect(alertDialog.parts.content.optional).toBe(true);
    expect(alertDialog.parts.trigger.optional).toBeUndefined();
    expect(alertDialog.parts.cancel.optional).toBe(true);
    expect(alertDialog.parts.action.optional).toBe(true);
  });
});

describe('alert-dialog state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(alertDialog.initialState({ defaultOpen: true }).open).toBe(true);
    expect(alertDialog.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    const state = alertDialog.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('alert-dialog canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = alertDialog.initialState(closed);
    expect(alertDialog.canDispatch(state, 'open', closed)).toBe(true);
    expect(alertDialog.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(alertDialog.canDispatch(openState, 'open', closed)).toBe(false);
    expect(alertDialog.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(alertDialog.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(alertDialog.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('alert-dialog actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(alertDialog, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('alert-dialog aria projection', () => {
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

  it('content: role alertdialog, ALWAYS modal, labelled and described', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.content).toEqual({
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'ti',
      'aria-describedby': 'd',
      'data-state': 'open',
    });
  });

  it('has no non-modal escape hatch: aria-modal stays true even if a modal flag is smuggled in', () => {
    const aria = ariaAt({ ...openUncontrolled, modal: false } as AlertDialogConfig);
    expect(aria.content?.['aria-modal']).toBe('true');
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

  it('projects no aria for the decision buttons (they are plain buttons)', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.cancel).toBeUndefined();
    expect(aria.action).toBeUndefined();
  });
});

describe('alert-dialog keymap', () => {
  const state = { open: true };
  it('Escape closes from anywhere inside the surface (content, cancel, action)', () => {
    expect(alertDialog.keymap({ key: 'Escape' }, state, 'content')).toBe('close');
    // Focus defaults to Cancel, so the bind resolves cancel/action as the part;
    // Escape must still close whichever focusable holds focus.
    expect(alertDialog.keymap({ key: 'Escape' }, state, 'cancel')).toBe('close');
    expect(alertDialog.keymap({ key: 'Escape' }, state, 'action')).toBe('close');
  });
  it('Escape on the (outside) trigger and other keys are not claimed', () => {
    expect(alertDialog.keymap({ key: 'Escape' }, state, 'trigger')).toBeNull();
    expect(alertDialog.keymap({ key: 'Enter' }, state, 'content')).toBeNull();
  });
});

// The modal overlay pair (focus-trap, scroll-lock, focus-to-Cancel) and the
// deliberate ABSENCE of outside-dismiss are asserted end to end in the
// conformance suites (alert-dialog.conformance.test.tsx / .astro. / .element.).
