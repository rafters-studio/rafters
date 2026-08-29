import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  contextMenu,
  contextSubMenu,
  directSubMenus,
  isContextMenuOpen,
  isSubMenuOpen,
  positionContextMenuContent,
  startContextMenuEffects,
  type ContextMenuConfig,
  type ContextMenuState,
  type ContextSubMenuState,
} from '../../../src/components/context-menu/context-menu.behavior';

const base: ContextMenuConfig = {};

describe('context-menu parts', () => {
  it('declares the trigger region and the menu content', () => {
    expect(Object.keys(contextMenu.parts).sort()).toEqual(['content', 'trigger']);
    // The menu surface carries the WAI-ARIA menu role.
    expect(contextMenu.parts.content.role).toBe('menu');
    expect(contextMenu.parts.content.optional).toBe(true);
    // The trigger is a plain pointer region -- no role.
    expect(contextMenu.parts.trigger.role).toBeUndefined();
  });
});

describe('context-menu state', () => {
  it('seeds closed at the origin, or open from defaultOpen', () => {
    expect(contextMenu.initialState(base)).toEqual({ open: false, x: 0, y: 0 });
    expect(contextMenu.initialState({ defaultOpen: true }).open).toBe(true);
    expect(contextMenu.initialState({ open: true }).open).toBe(true);
  });

  it('controlled open shadows intrinsic state', () => {
    const closed: ContextMenuState = { open: false, x: 0, y: 0 };
    expect(isContextMenuOpen(closed, { open: true })).toBe(true);
    expect(isContextMenuOpen({ open: true, x: 0, y: 0 }, { open: false })).toBe(false);
    expect(isContextMenuOpen(closed, {})).toBe(false);
  });
});

describe('context-menu actions', () => {
  it('openAt opens and records the pointer point', () => {
    const { memory, dispatch } = createBehavior(contextMenu, base);
    expect(dispatch('openAt', base, { x: 120, y: 40 })).toBe(true);
    expect(memory.get()).toEqual({ open: true, x: 120, y: 40 });
  });

  it('a second openAt repositions the menu', () => {
    const { memory, dispatch } = createBehavior(contextMenu, base);
    dispatch('openAt', base, { x: 10, y: 10 });
    expect(dispatch('openAt', base, { x: 200, y: 300 })).toBe(true);
    expect(memory.get()).toEqual({ open: true, x: 200, y: 300 });
  });

  it('close closes; it is rejected when already closed', () => {
    const { memory, dispatch } = createBehavior(contextMenu, base);
    expect(dispatch('close', base)).toBe(false);
    dispatch('openAt', base, { x: 5, y: 5 });
    expect(dispatch('close', base)).toBe(true);
    expect(memory.get().open).toBe(false);
  });

  it('close is rejected against a controlled-closed menu, allowed against controlled-open', () => {
    const { dispatch } = createBehavior(contextMenu, base);
    expect(dispatch('close', { open: false })).toBe(false);
    expect(dispatch('close', { open: true })).toBe(true);
  });
});

describe('context-menu keymap', () => {
  const state: ContextMenuState = { open: true, x: 0, y: 0 };
  it('Escape closes; navigation/printable keys are left to the primitives', () => {
    expect(contextMenu.keymap({ key: 'Escape' }, state, 'content', base)).toBe('close');
    expect(contextMenu.keymap({ key: 'ArrowDown' }, state, 'content', base)).toBeNull();
    expect(contextMenu.keymap({ key: 'a' }, state, 'content', base)).toBeNull();
    expect(contextMenu.keymap({ key: 'Enter' }, state, 'content', base)).toBeNull();
  });
});

describe('context-menu aria', () => {
  const ids = { trigger: 't', content: 'c' };

  it('closed: content carries the vertical menu orientation and is hidden', () => {
    const aria = contextMenu.aria({ open: false, x: 0, y: 0 }, base, ids);
    expect(aria.trigger?.['data-state']).toBe('closed');
    expect(aria.content).toEqual({
      'aria-orientation': 'vertical',
      'data-state': 'closed',
      hidden: true,
    });
  });

  it('open: content is shown (hidden projected undefined)', () => {
    const aria = contextMenu.aria({ open: true, x: 10, y: 10 }, base, ids);
    expect(aria.content?.['data-state']).toBe('open');
    expect(aria.content?.['hidden']).toBeUndefined();
  });

  it('a controlled-open projection tracks the config value', () => {
    const aria = contextMenu.aria({ open: false, x: 0, y: 0 }, { open: true }, ids);
    expect(aria.content?.['data-state']).toBe('open');
    expect(aria.content?.['hidden']).toBeUndefined();
  });
});

describe('context-menu positioning', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('places the menu top-left corner at the pointer point (fixed)', () => {
    const content = document.createElement('div');
    document.body.appendChild(content);
    positionContextMenuContent(content, { x: 15, y: 25 }, {});
    expect(content.style.position).toBe('fixed');
    expect(content.style.left).toBe('15px');
    expect(content.style.top).toBe('25px');
  });
});

describe('context-menu effects composition', () => {
  const stops: Array<() => void> = [];

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = '';
  });

  function mountContent(): HTMLElement {
    document.body.innerHTML = `
      <div data-part="content" role="menu">
        <div role="menuitem">Cut</div>
        <div role="menuitem">Copy</div>
        <div role="menuitem" data-disabled>Paste</div>
      </div>`;
    return document.body.querySelector('[data-part="content"]') as HTMLElement;
  }

  it('roving tabindex initializes across the enabled items', () => {
    const content = mountContent();
    const stop = startContextMenuEffects({ content, loop: true, onDismiss: () => {} });
    stops.push(stop);
    const items = content.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(items[0]?.getAttribute('tabindex')).toBe('0');
    expect(items[1]?.getAttribute('tabindex')).toBe('-1');
  });

  it('outside pointerdown dismisses; cleanup detaches every listener', () => {
    const content = mountContent();
    const onDismiss = vi.fn();
    const stop = startContextMenuEffects({ content, loop: true, onDismiss });
    stops.push(stop);

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    stop();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a pointerdown inside the menu does not dismiss', () => {
    const content = mountContent();
    const onDismiss = vi.fn();
    const stop = startContextMenuEffects({ content, loop: true, onDismiss });
    stops.push(stop);
    const item = content.querySelector<HTMLElement>('[role="menuitem"]');
    item?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('context-sub-menu score', () => {
  const base = {};
  const open: ContextSubMenuState = { open: true };
  const closed: ContextSubMenuState = { open: false };

  it('declares the sub-trigger menuitem and the sub-content menu', () => {
    expect(Object.keys(contextSubMenu.parts).sort()).toEqual(['subContent', 'subTrigger']);
    expect(contextSubMenu.parts.subTrigger.role).toBe('menuitem');
    expect(contextSubMenu.parts.subContent.role).toBe('menu');
  });

  it('controlled open shadows intrinsic state; close/open gate on the effective value', () => {
    expect(isSubMenuOpen(closed, { open: true })).toBe(true);
    expect(contextSubMenu.canDispatch(closed, 'close', base)).toBe(false);
    expect(contextSubMenu.canDispatch(closed, 'open', base)).toBe(true);
    expect(contextSubMenu.canDispatch(open, 'open', base)).toBe(false);
    expect(contextSubMenu.canDispatch(open, 'close', base)).toBe(true);
  });

  it('keymap: ArrowRight/Enter/Space open from the trigger, ArrowLeft/Escape close from the content', () => {
    for (const key of ['ArrowRight', 'Enter', ' ']) {
      expect(contextSubMenu.keymap({ key }, closed, 'subTrigger', base)).toBe('open');
    }
    for (const key of ['ArrowLeft', 'Escape']) {
      expect(contextSubMenu.keymap({ key }, open, 'subContent', base)).toBe('close');
    }
    // Cross-part keys do not fire (ArrowLeft on the trigger, ArrowRight in content).
    expect(contextSubMenu.keymap({ key: 'ArrowLeft' }, closed, 'subTrigger', base)).toBeNull();
    expect(contextSubMenu.keymap({ key: 'ArrowRight' }, open, 'subContent', base)).toBeNull();
  });

  it('aria: trigger advertises the popup, content is a vertical menu carrying data-state (never `hidden` -- #2152: a hidden node cannot transition, and the CSS reveal must work with JS off)', () => {
    const ids = { subTrigger: 'st', subContent: 'sc' };
    const closedAria = contextSubMenu.aria(closed, base, ids);
    expect(closedAria.subTrigger).toEqual({
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'data-state': 'closed',
    });
    expect(closedAria.subContent).toEqual({
      'aria-orientation': 'vertical',
      'data-state': 'closed',
      'data-open-source': undefined,
      // Dropping `hidden` (below) keeps a closed sub-content a live
      // `role="menu"` node in the accessibility tree, so `aria-hidden`
      // marks it hidden from AT the same way `hidden` used to --
      // without collapsing layout, so the CSS transition still runs.
      'aria-hidden': 'true',
    });
    expect(closedAria.subContent?.['hidden']).toBeUndefined();
    const openAria = contextSubMenu.aria(open, base, ids);
    expect(openAria.subTrigger?.['aria-expanded']).toBe('true');
    expect(openAria.subTrigger?.['aria-controls']).toBe('sc');
    expect(openAria.subContent).toEqual({
      'aria-orientation': 'vertical',
      'data-state': 'open',
      // `open` here has no `openSource` (a bare `{ open: true }` literal, as
      // a controlled/never-dispatched open would produce) -- no delay mark,
      // and `aria-hidden` is gone the instant it is open.
      'data-open-source': undefined,
      'aria-hidden': undefined,
    });
  });

  it('aria: data-open-source mirrors state.openSource while open, scoping the CSS hover-intent delay to a genuine pointer open', () => {
    const ids = { subTrigger: 'st', subContent: 'sc' };
    const openFromPointer: ContextSubMenuState = { open: true, openSource: 'pointer' };
    const openFromDiscrete: ContextSubMenuState = { open: true, openSource: 'discrete' };
    expect(contextSubMenu.aria(openFromPointer, base, ids).subContent?.['data-open-source']).toBe(
      'pointer',
    );
    expect(contextSubMenu.aria(openFromDiscrete, base, ids).subContent?.['data-open-source']).toBe(
      'discrete',
    );
    // Closed always removes the mark, even if state still carries a stale one
    // from before the close (the actions reducer clears it, but aria() itself
    // does not rely on that -- it gates on `open` directly).
    const closedButStale: ContextSubMenuState = { open: false, openSource: 'pointer' };
    expect(
      contextSubMenu.aria(closedButStale, base, ids).subContent?.['data-open-source'],
    ).toBeUndefined();
  });

  it('actions: open stores which input opened it; close always clears it', () => {
    const initial: ContextSubMenuState = { open: false };
    const openedByPointer = contextSubMenu.actions.open(initial, 'pointer');
    expect(openedByPointer).toEqual({ open: true, openSource: 'pointer' });
    const openedByDiscrete = contextSubMenu.actions.open(initial, 'discrete');
    expect(openedByDiscrete).toEqual({ open: true, openSource: 'discrete' });
    expect(contextSubMenu.actions.close(openedByPointer, undefined)).toEqual({
      open: false,
      openSource: undefined,
    });
  });
});

describe('directSubMenus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns only the submenus directly inside the container, not nested ones', () => {
    document.body.innerHTML = `
      <div data-part="content" role="menu">
        <div data-part="sub" id="s1">
          <div data-part="sub-trigger" role="menuitem">More</div>
          <div data-part="sub-content" role="menu">
            <div data-part="sub" id="s2">
              <div data-part="sub-trigger" role="menuitem">Even more</div>
              <div data-part="sub-content" role="menu"></div>
            </div>
          </div>
        </div>
      </div>`;
    const content = document.body.querySelector('[data-part="content"]') as HTMLElement;
    const direct = directSubMenus(content).map((el) => el.id);
    expect(direct).toEqual(['s1']);
  });
});
