import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  activeItem,
  navInstanceAria,
  navigationMenu,
  startNavigationMenuEffects,
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
    const open = navInstanceAria('trigger', 'a', { active: 'a', pointerOpened: false }, base, {
      content: 'c-a',
    });
    expect(open).toEqual({
      'aria-expanded': 'true',
      'aria-controls': 'c-a',
      'data-state': 'open',
    });
    const closed = navInstanceAria('trigger', 'b', { active: 'a', pointerOpened: false }, base, {
      content: 'c-b',
    });
    expect(closed['aria-expanded']).toBe('false');
    expect(closed['data-state']).toBe('closed');
  });

  it('content instances: labelled by their trigger, hidden when closed', () => {
    const open = navInstanceAria('content', 'a', { active: 'a', pointerOpened: false }, base, {
      trigger: 't-a',
    });
    expect(open).toEqual({ 'aria-labelledby': 't-a', 'data-state': 'open', hidden: undefined });
    const closed = navInstanceAria('content', 'a', { active: null, pointerOpened: false }, base, {
      trigger: 't-a',
    });
    expect(closed['hidden']).toBe(true);
  });

  it('instance projections read the CONTROLLED value', () => {
    const aria = navInstanceAria(
      'trigger',
      'a',
      { active: null, pointerOpened: false },
      { value: 'a' },
      { content: 'c' },
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

describe('navigation-menu effects composition', () => {
  // The score no longer emits vocabulary effects: roving/hover/dismiss are
  // composed directly from the primitives by startNavigationMenuEffects, which
  // both the DOM-native and React bindings call. These tests drive that
  // composition seam -- including the immediate-switch semantics conformance
  // does not exercise -- against real DOM.
  interface Harness {
    root: HTMLElement;
    open: { value: string | null };
    onHoverOpen: ReturnType<typeof vi.fn>;
    onClose: ReturnType<typeof vi.fn>;
    stop: () => void;
  }

  const stops: Array<() => void> = [];

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function mountMenu(): HTMLElement {
    document.body.innerHTML = `
      <nav data-part="root">
        <ul data-part="list">
          <li>
            <button type="button" data-part="trigger" data-value="a" data-roving-item>A</button>
            <div data-part="content" data-value="a"><a href="/a">A</a></div>
          </li>
          <li>
            <button type="button" data-part="trigger" data-value="b" data-roving-item>B</button>
            <div data-part="content" data-value="b"><a href="/b">B</a></div>
          </li>
        </ul>
      </nav>`;
    return document.body.querySelector('[data-part="root"]') as HTMLElement;
  }

  const triggerFor = (root: HTMLElement, value: string): HTMLElement => {
    const element = root.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
    if (!element) throw new Error(`no trigger for ${value}`);
    return element;
  };

  function start(delay = 200): Harness {
    const root = mountMenu();
    const open = { value: null as string | null };
    const onHoverOpen = vi.fn((value: string) => {
      open.value = value;
    });
    const onClose = vi.fn(() => {
      open.value = null;
    });
    const stop = startNavigationMenuEffects({
      root,
      list: root.querySelector<HTMLElement>('[data-part="list"]'),
      orientation: 'horizontal',
      delay,
      isOpen: () => open.value !== null,
      onHoverOpen,
      onClose,
    });
    stops.push(stop);
    return { root, open, onHoverOpen, onClose, stop };
  }

  it('roving tabindex initializes across the trigger list', () => {
    const h = start();
    expect(triggerFor(h.root, 'a').getAttribute('tabindex')).toBe('0');
    expect(triggerFor(h.root, 'b').getAttribute('tabindex')).toBe('-1');
  });

  it('hover opens the trigger after the delay when nothing is open', () => {
    vi.useFakeTimers();
    const h = start(200);
    triggerFor(h.root, 'a').dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(199);
    expect(h.onHoverOpen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(h.onHoverOpen).toHaveBeenCalledWith('a');
  });

  it('while a panel is open, hovering another trigger switches immediately', () => {
    vi.useFakeTimers();
    const h = start(200);
    h.open.value = 'a'; // a panel is already open
    triggerFor(h.root, 'b').dispatchEvent(new Event('pointerenter'));
    // No timer advance: the menubar-style switch is synchronous.
    expect(h.onHoverOpen).toHaveBeenCalledWith('b');
  });

  it('leaving schedules a close only while a panel is open', () => {
    vi.useFakeTimers();
    const h = start(200);
    // Closed: a leave never closes.
    triggerFor(h.root, 'a').dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(200);
    expect(h.onClose).not.toHaveBeenCalled();
    // Open: a leave closes after the delay.
    h.open.value = 'a';
    triggerFor(h.root, 'a').dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(199);
    expect(h.onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(h.onClose).toHaveBeenCalledTimes(1);
  });

  it('outside pointerdown closes; cleanup detaches every listener', () => {
    const h = start();
    h.open.value = 'a';
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(h.onClose).toHaveBeenCalledTimes(1);

    h.stop();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    triggerFor(h.root, 'a').dispatchEvent(new Event('pointerenter'));
    expect(h.onClose).toHaveBeenCalledTimes(1);
    expect(h.onHoverOpen).not.toHaveBeenCalled();
  });
});
