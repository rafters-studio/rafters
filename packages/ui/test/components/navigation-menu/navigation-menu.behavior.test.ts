import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  activeItem,
  navContentAria,
  navigationMenu,
  navTriggerAria,
  type NavigationMenuConfig,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';

const base: NavigationMenuConfig = {};
const openOnA: NavigationMenuConfig = { defaultValue: 'a' };

describe('navigation-menu parts', () => {
  it('declares root, list, the many-instance trigger/content, and the chrome', () => {
    expect(Object.keys(navigationMenu.parts).sort()).toEqual([
      'content',
      'indicator',
      'list',
      'root',
      'trigger',
      'viewport',
    ]);
    expect(navigationMenu.parts.trigger.many).toBe(true);
    expect(navigationMenu.parts.content.many).toBe(true);
    // Content is NOT optional: closed panels stay in the DOM for crawlers.
    expect(navigationMenu.parts.content.optional).toBeUndefined();
    expect(navigationMenu.parts.viewport.optional).toBe(true);
    expect(navigationMenu.parts.indicator.optional).toBe(true);
  });
});

describe('navigation-menu state', () => {
  it('seeds from defaultValue; empty string means nothing open', () => {
    expect(navigationMenu.initialState(base).active).toBeNull();
    expect(navigationMenu.initialState({ defaultValue: '' }).active).toBeNull();
    expect(navigationMenu.initialState(openOnA).active).toBe('a');
  });

  it('controlled value shadows intrinsic state', () => {
    expect(activeItem({ active: 'a', pointerOpened: false }, { value: 'b' })).toBe('b');
    expect(activeItem({ active: 'a', pointerOpened: false }, { value: '' })).toBeNull();
    expect(activeItem({ active: 'a', pointerOpened: false }, {})).toBe('a');
  });
});

describe('navigation-menu actions', () => {
  it('open, toggle, and close move the active item', () => {
    const { memory, dispatch } = createBehavior(navigationMenu, base);
    expect(dispatch('open', base, 'a')).toBe(true);
    expect(memory.get().active).toBe('a');
    expect(dispatch('open', base, 'b')).toBe(true);
    expect(memory.get().active).toBe('b');
    expect(dispatch('toggle', base, 'b')).toBe(true);
    expect(memory.get().active).toBeNull();
    expect(dispatch('toggle', base, 'a')).toBe(true);
    expect(memory.get().active).toBe('a');
    expect(dispatch('close', base)).toBe(true);
    expect(memory.get().active).toBeNull();
  });

  it('close is rejected when nothing is effectively open', () => {
    const { dispatch } = createBehavior(navigationMenu, base);
    expect(dispatch('close', base)).toBe(false);
    expect(dispatch('close', { value: 'a' })).toBe(true);
  });

  it('toggle absorbs exactly one click after a hover-open', () => {
    const { memory, dispatch } = createBehavior(navigationMenu, base);
    expect(dispatch('hoverOpen', base, 'a')).toBe(true);
    expect(memory.get()).toEqual({ active: 'a', pointerOpened: true });
    // The click that rode in on the same gesture: stays open.
    expect(dispatch('toggle', base, 'a')).toBe(true);
    expect(memory.get()).toEqual({ active: 'a', pointerOpened: false });
    // A deliberate second click: closes.
    expect(dispatch('toggle', base, 'a')).toBe(true);
    expect(memory.get().active).toBeNull();
  });

  it('deliberate open clears the hover flag', () => {
    const { memory, dispatch } = createBehavior(navigationMenu, base);
    dispatch('hoverOpen', base, 'a');
    dispatch('open', base, 'b');
    expect(memory.get()).toEqual({ active: 'b', pointerOpened: false });
  });
});

describe('navigation-menu keymap', () => {
  const state = { active: null, pointerOpened: false };
  it('Escape closes from any part', () => {
    expect(navigationMenu.keymap({ key: 'Escape' }, state, 'root', base)).toBe('close');
    expect(navigationMenu.keymap({ key: 'Escape' }, state, 'trigger', base)).toBe('close');
  });

  it('ArrowDown opens on the horizontal axis only', () => {
    expect(navigationMenu.keymap({ key: 'ArrowDown' }, state, 'trigger', base)).toBe('open');
    expect(
      navigationMenu.keymap({ key: 'ArrowDown' }, state, 'trigger', { orientation: 'vertical' }),
    ).toBeNull();
    expect(navigationMenu.keymap({ key: 'ArrowDown' }, state, 'root', base)).toBeNull();
  });

  it('Enter and Space declare toggle on triggers (native buttons fulfill it)', () => {
    expect(navigationMenu.keymap({ key: 'Enter' }, state, 'trigger', base)).toBe('toggle');
    expect(navigationMenu.keymap({ key: ' ' }, state, 'trigger', base)).toBe('toggle');
    expect(navigationMenu.keymap({ key: 'Enter' }, state, 'root', base)).toBeNull();
  });
});

describe('navigation-menu aria', () => {
  const ids = { root: 'r', list: 'l', trigger: '', content: '', viewport: 'v', indicator: 'i' };

  it('root and list carry orientation; root reflects open state', () => {
    const aria = navigationMenu.aria({ active: null, pointerOpened: false }, base, ids);
    expect(aria.root?.['data-orientation']).toBe('horizontal');
    expect(aria.root?.['data-state']).toBe('closed');
    expect(aria.root?.['aria-label']).toBe('Main navigation');
    expect(aria.list?.['data-orientation']).toBe('horizontal');
    expect(
      navigationMenu.aria({ active: 'a', pointerOpened: false }, base, ids).root?.['data-state'],
    ).toBe('open');
  });

  it('trigger instances: expanded tracks the active value, controls is never dangling', () => {
    const open = navTriggerAria('a', { active: 'a', pointerOpened: false }, base, {
      contentId: 'c-a',
    });
    expect(open).toEqual({
      'aria-expanded': 'true',
      'aria-controls': 'c-a',
      'data-state': 'open',
    });
    const closed = navTriggerAria('b', { active: 'a', pointerOpened: false }, base, {
      contentId: 'c-b',
    });
    expect(closed['aria-expanded']).toBe('false');
    expect(closed['data-state']).toBe('closed');
  });

  it('content instances: labelled by their trigger, hidden when closed', () => {
    const open = navContentAria('a', { active: 'a', pointerOpened: false }, base, {
      triggerId: 't-a',
    });
    expect(open).toEqual({ 'aria-labelledby': 't-a', 'data-state': 'open', hidden: undefined });
    const closed = navContentAria('a', { active: null, pointerOpened: false }, base, {
      triggerId: 't-a',
    });
    expect(closed['hidden']).toBe(true);
  });

  it('instance projections read the CONTROLLED value', () => {
    const aria = navTriggerAria(
      'a',
      { active: null, pointerOpened: false },
      { value: 'a' },
      { contentId: 'c' },
    );
    expect(aria['aria-expanded']).toBe('true');
  });

  it('viewport and indicator chrome reflect the open state', () => {
    const closed = navigationMenu.aria({ active: null, pointerOpened: false }, base, ids);
    expect(closed.viewport).toEqual({ 'data-state': 'closed', 'aria-hidden': 'true' });
    expect(closed.indicator).toEqual({ 'data-state': 'hidden', 'aria-hidden': 'true' });
    const open = navigationMenu.aria({ active: 'a', pointerOpened: false }, base, ids);
    expect(open.viewport).toEqual({ 'data-state': 'open', 'aria-hidden': undefined });
    expect(open.indicator).toEqual({ 'data-state': 'visible', 'aria-hidden': 'true' });
  });
});

describe('navigation-menu effects', () => {
  it('closed: roving focus and delayed hover intent, no dismissal layer', () => {
    const effects = navigationMenu.effects({ active: null, pointerOpened: false }, base);
    expect(effects).toEqual([
      { type: 'roving-focus', part: 'list', orientation: 'horizontal' },
      {
        type: 'hover-intent',
        part: 'root',
        triggerPart: 'trigger',
        contentPart: 'content',
        delay: 200,
        immediate: false,
        openAction: 'hoverOpen',
        closeAction: 'close',
      },
    ]);
  });

  it('open: hover switches immediately and outside pointerdown dismisses', () => {
    const effects = navigationMenu.effects({ active: 'a', pointerOpened: false }, base);
    expect(effects).toContainEqual({ type: 'dismiss-on-outside', part: 'root', action: 'close' });
    const hover = effects.find((effect) => effect.type === 'hover-intent');
    expect(hover).toMatchObject({ immediate: true });
  });

  it('orientation and delay flow from config', () => {
    const effects = navigationMenu.effects(
      { active: null, pointerOpened: false },
      { orientation: 'vertical', delayDuration: 50 },
    );
    expect(effects[0]).toMatchObject({ orientation: 'vertical' });
    expect(effects[1]).toMatchObject({ delay: 50 });
  });
});
