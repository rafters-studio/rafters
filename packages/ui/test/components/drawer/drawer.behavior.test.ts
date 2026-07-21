import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  drawer,
  drawerSide,
  isOpen,
  type DrawerConfig,
  type DrawerPart,
} from '../../../src/components/drawer/drawer.behavior';

const ids: PartIds<DrawerPart> = {
  trigger: 't',
  content: 'c',
  overlay: 'o',
  title: 'ti',
  description: 'd',
  close: 'x',
};

const closed: DrawerConfig = {};
const openUncontrolled: DrawerConfig = { defaultOpen: true };

function ariaAt(config: DrawerConfig, partIds: PartIds<DrawerPart> = ids) {
  return drawer.aria(drawer.initialState(config), config, partIds);
}

describe('drawer parts', () => {
  it('declares the dialog surface (a drawer is an edge-anchored dialog)', () => {
    expect(Object.keys(drawer.parts).sort()).toEqual([
      'close',
      'content',
      'description',
      'overlay',
      'title',
      'trigger',
    ]);
    expect(drawer.parts.content.optional).toBe(true);
    expect(drawer.parts.trigger.optional).toBeUndefined();
  });
});

describe('drawer side', () => {
  it('defaults to bottom (touch), and echoes an explicit edge', () => {
    expect(drawerSide({})).toBe('bottom');
    expect(drawerSide({ side: 'right' })).toBe('right');
    expect(drawerSide({ side: 'top' })).toBe('top');
    expect(drawerSide({ side: 'left' })).toBe('left');
  });

  it('is edge-independent in the score: side never reaches the ARIA projection', () => {
    const bottom = ariaAt(openUncontrolled);
    const right = ariaAt({ ...openUncontrolled, side: 'right' });
    expect(right).toEqual(bottom);
  });
});

describe('drawer state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(drawer.initialState({ defaultOpen: true }).open).toBe(true);
    expect(drawer.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    const state = drawer.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('drawer canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = drawer.initialState(closed);
    expect(drawer.canDispatch(state, 'open', closed)).toBe(true);
    expect(drawer.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(drawer.canDispatch(openState, 'open', closed)).toBe(false);
    expect(drawer.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(drawer.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(drawer.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('drawer actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(drawer, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('drawer aria projection', () => {
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

describe('drawer keymap', () => {
  const state = { open: true };
  it('Escape on content maps to close', () => {
    expect(drawer.keymap({ key: 'Escape' }, state, 'content')).toBe('close');
  });
  it('Escape elsewhere and other keys are not claimed', () => {
    expect(drawer.keymap({ key: 'Escape' }, state, 'trigger')).toBeNull();
    expect(drawer.keymap({ key: 'Enter' }, state, 'content')).toBeNull();
  });
});

// The modal overlay trio (focus-trap, scroll-lock, trigger-spared outside
// dismissal) is composed by the bindings directly, not declared on the score;
// the BEHAVIOR is asserted end to end in the conformance suites
// (drawer.conformance.test.tsx / .astro. / .element.).
