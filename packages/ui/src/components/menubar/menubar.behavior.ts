import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type InstanceIds,
  type KeyInput,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { computePosition } from '../../primitives/collision-detector';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  dropdownMenu,
  focusFirstItem,
  startDropdownMenuEffects,
} from '../dropdown-menu/dropdown-menu.behavior';

/**
 * Menubar: a horizontal row of triggers, each opening a menu of actions. Almost
 * nothing here is new. Each menu IS dropdown-menu's behavior -- its projections
 * (the menu button trigger, the vertical `role="menu"` named by its trigger),
 * its keymap (open from the trigger, Escape from the menu), and its open-menu
 * effect trio (roving focus, typeahead, outside dismissal) are called, not
 * copied. The row of triggers is the roving-focus bar navigation-menu runs.
 *
 * The new work is the glue between the menus (Spec 02: cross-slice
 * coordination goes in the glue slice, nowhere else):
 *   - one menu open at a time -- the score's only axis is WHICH menu is open;
 *   - moving between menus while one is open -- ArrowRight/ArrowLeft inside a
 *     menu, focus roving across the triggers, or the pointer crossing to
 *     another trigger all switch the open menu.
 *
 * The highlighted item is NOT state: it is ephemeral DOM focus owned by
 * roving-focus and styled via `:focus`, the stance dropdown-menu documents.
 *
 * Why a value axis and not N disclosable cells: disclosable's `open` is a
 * boolean, and N copies of it collide on the one state key (and could not
 * express "at most one"). The score owns `active` (which menu), and each menu's
 * disclosable projection is dropdown-menu's, evaluated at `active === value`.
 */
export interface MenubarConfig {
  /** Controlled open menu ('' = none). Passed fresh, never stored. */
  value?: string | undefined;
  /** Uncontrolled seed. */
  defaultValue?: string | undefined;
  /** Wrap at the ends of the trigger row. Default true. */
  loop?: boolean | undefined;
}

export interface MenubarState {
  /** The intrinsic open menu, or null when every menu is closed. */
  active: string | null;
  /** The open menu was switched to by the pointer crossing onto its trigger.
   *  A real click always crosses onto its target first (pointermove precedes
   *  pointerdown in the same gesture), so the click that lands right after
   *  must not close the menu the crossing just opened: `toggle` absorbs
   *  exactly one such click. Gesture memory for the one axis, not a second
   *  axis -- navigation-menu's `pointerOpened`, for the same defect. */
  pointerOpened: boolean;
}

/** Payload for moving the open menu to a neighbour: the trigger values in DOM
 *  order, the menu to step FROM (the effective value, so a controlled menubar
 *  steps from what the consumer shows), and whether the row wraps. */
export interface MenubarStep {
  values: readonly string[];
  from: string | null;
  loop: boolean;
}

/** Payload for a gesture on one trigger: the menu it names, and the menu that
 *  is open right now (the effective value, so a controlled menubar decides from
 *  what the consumer shows, not from a drifted intrinsic cell). */
export interface MenubarTarget {
  value: string;
  from: string | null;
}

export type MenubarActions = {
  /** Open (or switch to) a menu deliberately (payload: menu value). */
  open: string;
  /** Switch the open menu because the pointer crossed onto its trigger.
   *  Marks the switch as pointer-made. */
  follow: MenubarTarget;
  /** A click on a trigger: open its menu, close it when it is the open menu,
   *  or keep it open once if the pointer just switched to it. */
  toggle: MenubarTarget;
  /** Close whatever is open. */
  close: undefined;
  /** Switch the open menu to the next trigger. */
  next: MenubarStep;
  /** Switch the open menu to the previous trigger. */
  prev: MenubarStep;
};

export type MenubarPart = 'root' | 'trigger' | 'content' | 'item';

/** The effective open menu: controlled value shadows intrinsic state. */
export function activeMenu(state: MenubarState, config: MenubarConfig): string | null {
  if (config.value !== undefined) return config.value === '' ? null : config.value;
  return state.active;
}

/** The neighbour `delta` steps from `step.from` along `step.values`. Pure. */
export function stepMenu(step: MenubarStep, delta: 1 | -1): string | null {
  const count = step.values.length;
  if (count === 0) return null;
  const index = step.from === null ? -1 : step.values.indexOf(step.from);
  let next = index === -1 ? (delta === 1 ? 0 : count - 1) : index + delta;
  if (next < 0) next = step.loop ? count - 1 : 0;
  if (next >= count) next = step.loop ? 0 : count - 1;
  return step.values[next] ?? null;
}

/** The bar: which menu is open, and the parts the row declares. */
const bar: Slice<MenubarConfig, MenubarState, MenubarActions, MenubarPart> = {
  name: 'menubar-bar',
  parts: {
    root: { role: 'menubar' },
    trigger: { many: true, role: 'menuitem' },
    // Each menu is present but hidden while closed (no mount/unmount), so the
    // item set is readable by the open-menu effects the moment it opens.
    content: { many: true },
    // Role is author markup: checkbox/radio items use menuitemcheckbox/radio.
    item: { many: true },
  },
  initialState: (config) => {
    const seed = config.value ?? config.defaultValue ?? '';
    return { active: seed === '' ? null : seed, pointerOpened: false };
  },
  actions: {
    open: (_state, value) => ({ active: value, pointerOpened: false }),
    // Crossing onto the trigger of the menu already open changes nothing, so a
    // stray pointer move can never arm the absorption for a click-opened menu.
    follow: (state, { value, from }) =>
      from === value ? state : { active: value, pointerOpened: true },
    toggle: (state, { value, from }) => {
      if (from !== value) return { active: value, pointerOpened: false };
      if (state.pointerOpened) return { active: value, pointerOpened: false };
      return { active: null, pointerOpened: false };
    },
    close: () => ({ active: null, pointerOpened: false }),
    next: (state, step) => ({ active: stepMenu(step, 1) ?? state.active, pointerOpened: false }),
    prev: (state, step) => ({ active: stepMenu(step, -1) ?? state.active, pointerOpened: false }),
  },
  // Close, follow and the neighbour moves only act while a menu is open:
  // moving between menus is a gesture of an OPEN menubar (a closed one does not
  // open on hover or focus movement), and closing the closed is a no-op.
  canDispatch: (state, action, config) =>
    action === 'open' || action === 'toggle' ? true : activeMenu(state, config) !== null,
  aria: (state, config) => ({
    root: {
      role: 'menubar',
      'aria-orientation': 'horizontal',
      'data-state': activeMenu(state, config) === null ? 'closed' : 'open',
    },
  }),
};

/**
 * The glue: the keymap between the menus. The trigger and the menu keys are
 * dropdown-menu's own keymap, asked as if that one menu were closed (trigger)
 * or open (menu); what the glue adds is ArrowRight/ArrowLeft inside an open
 * menu stepping to the neighbouring menu.
 */
const glue: GlueSlice<MenubarConfig, MenubarState, MenubarActions, MenubarPart> = {
  kind: 'glue',
  name: 'menubar',
  keymap: (event, _state, part) => {
    if (part === 'trigger') {
      return dropdownMenu.keymap(event, { open: false }, 'trigger', {}) === 'open' ? 'open' : null;
    }
    if (part === 'content' || part === 'item') {
      if (dropdownMenu.keymap(event, { open: true }, part, {}) === 'close') return 'close';
      if (event.key === 'ArrowRight') return 'next';
      if (event.key === 'ArrowLeft') return 'prev';
    }
    return null;
  },
};

/**
 * Per-instance ARIA for the `many` parts (Spec 01: BehaviorSpec.instanceAria).
 * A trigger and its menu are exactly dropdown-menu's trigger and content,
 * projected at `open = (active === value)`. The trigger adds `role="menuitem"`:
 * inside a menubar the menu button is a menuitem of the bar (WAI-ARIA APG).
 */
export function menubarInstanceAria(
  part: MenubarPart,
  value: string,
  state: MenubarState,
  config: MenubarConfig,
  ids: InstanceIds<MenubarPart>,
): AriaAttrs {
  if (part !== 'trigger' && part !== 'content') return {};
  const menu = dropdownMenu.aria(
    { open: activeMenu(state, config) === value },
    {},
    {
      root: '',
      trigger: ids.trigger ?? '',
      content: ids.content ?? '',
      item: '',
    },
  );
  const attrs = menu[part] ?? {};
  return part === 'trigger' ? { ...attrs, role: 'menuitem' } : attrs;
}

export const menubar: BehaviorSpec<MenubarConfig, MenubarState, MenubarActions, MenubarPart> = {
  ...compose('menubar', bar, glue),
  instanceAria: menubarInstanceAria,
};

/** The enabled trigger values in DOM order -- the row the neighbour step walks. */
export function menubarValues(bar: HTMLElement): string[] {
  const values: string[] = [];
  for (const trigger of bar.querySelectorAll<HTMLElement>('[data-part="trigger"]')) {
    if (trigger.hasAttribute('disabled') || trigger.getAttribute('aria-disabled') === 'true') {
      continue;
    }
    const value = trigger.dataset['value'];
    if (value !== undefined) values.push(value);
  }
  return values;
}

/**
 * Anchor an open menu under its trigger via the collision-detector primitive.
 * The menus live OUTSIDE the bar (see bindMenubar), so they are positioned
 * rather than laid out in flow. Shared by every client.
 */
export function positionMenubarContent(trigger: HTMLElement, content: HTMLElement): void {
  const result = computePosition(trigger, content, { side: 'bottom', align: 'start' });
  content.style.position = 'fixed';
  content.style.left = `${Math.round(result.x)}px`;
  content.style.top = `${Math.round(result.y)}px`;
}

/** The parts and dispatch the bar composes against. */
export interface MenubarBarPorts {
  /** The row of triggers. Holds ONLY triggers: the menus live outside it, or
   *  their menuitems would join the trigger rove. */
  bar: HTMLElement;
  loop: boolean;
  /** The effective open menu right now (read at event time, never captured). */
  current: () => string | null;
  /** Switch the open menu to this value -- focus (`pointer` false) or the
   *  pointer (`pointer` true) reached its trigger while a menu was open. */
  onFollow: (value: string, pointer: boolean) => void;
}

/**
 * The bar, composed directly: roving tabindex across the triggers, and the
 * open menu following focus or the pointer onto another trigger while a menu
 * is open (a closed menubar does not open on hover or on focus movement).
 * Level-triggered for the menubar's lifetime; both bindMenubar and the React
 * Menubar start it once on mount. Cleanup releases LIFO.
 *
 * The pointer follows on `pointermove`, not `pointerover`. The browser also
 * fires boundary events (pointerover) at a pointer that has not moved, when the
 * element under it changes -- a re-render, a menu hiding -- and a menu must not
 * switch because the page moved under a resting cursor. Only the user moving
 * the pointer across a trigger produces pointermove there.
 */
export function startMenubarBar({ bar, loop, current, onFollow }: MenubarBarPorts): () => void {
  const follow = (trigger: Element | null, pointer: boolean) => {
    const open = current();
    if (open === null || !(trigger instanceof HTMLElement)) return;
    const value = trigger.dataset['value'];
    if (value === undefined || value === open || trigger.hasAttribute('disabled')) return;
    onFollow(value, pointer);
  };
  const releaseRoving = createRovingFocus(bar, {
    orientation: 'horizontal',
    loop,
    onNavigate: (element) => follow(element, false),
  });
  const onPointerMove = (event: Event) => {
    follow((event.target as HTMLElement).closest('[data-part="trigger"]'), true);
  };
  bar.addEventListener('pointermove', onPointerMove);
  return () => {
    bar.removeEventListener('pointermove', onPointerMove);
    releaseRoving();
  };
}

/** The ports one open menu composes against. */
export interface MenubarMenuPorts {
  bar: HTMLElement;
  trigger: HTMLElement;
  content: HTMLElement;
  /** Outside-pointerdown dismissal (a pointerdown on the bar is spared: it is
   *  a trigger click, which switches or closes through the click path). */
  onDismiss: () => void;
}

/**
 * One open menu: position it under its trigger, then run dropdown-menu's own
 * open-menu trio over it (roving focus, typeahead, outside dismissal). The bar
 * stands in for the trigger dropdown-menu spares, so a pointerdown on ANY
 * trigger is left to the click path. Started when a menu opens (or the open
 * menu changes) and torn down when it closes.
 */
export function startMenubarMenu({
  bar,
  trigger,
  content,
  onDismiss,
}: MenubarMenuPorts): () => void {
  positionMenubarContent(trigger, content);
  return startDropdownMenuEffects({ content, getTrigger: () => bar, onDismiss });
}

/** Move focus into an opened menu unless it is already there. */
export function focusMenu(content: HTMLElement | null): void {
  if (content && !content.contains(content.ownerDocument.activeElement)) focusFirstItem(content);
}

const keyInputOf = (event: KeyboardEvent): KeyInput => ({
  key: event.key,
  shiftKey: event.shiftKey,
  ctrlKey: event.ctrlKey,
  altKey: event.altKey,
  metaKey: event.metaKey,
});

const isDisabledItem = (item: HTMLElement): boolean =>
  item.hasAttribute('data-disabled') || item.getAttribute('aria-disabled') === 'true';

/**
 * The DOM-native binding of the menubar score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React reads the projections
 * declaratively.
 *
 * Markup contract: the root holds the triggers (`data-part="trigger"`
 * `data-value`) and each menu (`data-part="content"` `data-value`). On bind every
 * menu MOVES out of the bar to sit right after it, and is restored on teardown
 * (the context-menu submenu precedent): the trigger rove is roving-focus over
 * the root, which collects every `role="menuitem"` beneath it, so a menu left
 * inside the bar would pour its items into the trigger row. Right after the
 * bar -- not the end of the body -- keeps each menu inside whatever landmark
 * holds the bar. Outside the bar the menus no longer bubble to the root, so the
 * bind listens on each of them as well.
 */
export function bindMenubar(root: HTMLElement): () => void {
  const contents = Array.from(root.querySelectorAll<HTMLElement>('[data-part="content"]'));
  const triggers = Array.from(root.querySelectorAll<HTMLElement>('[data-part="trigger"]'));

  const config: MenubarConfig = {
    loop: root.dataset['loop'] !== 'false',
    defaultValue:
      triggers.find((trigger) => trigger.dataset['state'] === 'open')?.dataset['value'] ?? '',
  };

  const triggerFor = (value: string): HTMLElement | null =>
    triggers.find((trigger) => trigger.dataset['value'] === value) ?? null;
  const contentFor = (value: string): HTMLElement | null =>
    contents.find((content) => content.dataset['value'] === value) ?? null;

  // Remember each menu's authored place, then move it out of the bar.
  const homes = contents.map((content) => ({
    content,
    parent: content.parentElement,
    next: content.nextSibling,
  }));
  root.after(...contents);

  const { memory, dispatch } = createBehavior(menubar, config);
  const effective = () => activeMenu(memory.get(), config);
  const step = () => ({
    values: menubarValues(root),
    from: effective(),
    loop: config.loop ?? true,
  });

  const rootIds = { root: root.id, trigger: '', content: '', item: '' } as PartIds<MenubarPart>;

  // Resolved projection: apply raw (validate:false skips aria-manager's
  // author-input coercion that would flip the string 'false' to truthy).
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let openMenu: { value: string; stop: () => void } | null = null;

  const render = () => {
    const state = memory.get();
    const active = activeMenu(state, config);
    applyProjection(root, menubar.aria(state, config, rootIds).root ?? {});
    for (const trigger of triggers) {
      const value = trigger.dataset['value'];
      if (value === undefined) continue;
      const content = contentFor(value);
      const ids = { trigger: trigger.id, content: content?.id ?? '' };
      applyProjection(trigger, menubarInstanceAria('trigger', value, state, config, ids));
      if (content) {
        applyProjection(content, menubarInstanceAria('content', value, state, config, ids));
        content.hidden = value !== active;
      }
    }

    // One open menu at a time: tear down the previous menu's effects before
    // starting the next (content is already un-hidden above).
    if (openMenu && openMenu.value !== active) {
      openMenu.stop();
      openMenu = null;
    }
    if (active !== null && !openMenu) {
      const trigger = triggerFor(active);
      const content = contentFor(active);
      if (trigger && content) {
        openMenu = {
          value: active,
          stop: startMenubarMenu({
            bar: root,
            trigger,
            content,
            onDismiss: () => void dispatch('close', config),
          }),
        };
        focusMenu(content);
      }
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const stopBar = startMenubarBar({
    bar: root,
    loop: config.loop ?? true,
    current: effective,
    onFollow: (value, pointer) =>
      void (pointer
        ? dispatch('follow', config, { value, from: effective() })
        : dispatch('open', config, value)),
  });

  /** Close the open menu and return focus to its trigger. */
  const closeToTrigger = () => {
    const value = effective();
    if (!dispatch('close', config)) return;
    if (value !== null) triggerFor(value)?.focus();
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-part="item"]');
    if (item) {
      // Activating an item runs its action (author markup) and closes.
      if (!isDisabledItem(item)) closeToTrigger();
      return;
    }
    const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
    const value = trigger?.dataset['value'];
    if (!trigger || value === undefined || trigger.hasAttribute('disabled')) return;
    // Clicking the open menu's trigger closes it; any other trigger opens its
    // menu (switching from whichever was open) -- see the `toggle` reducer.
    dispatch('toggle', config, { value, from: effective() });
    // The press moved focus onto the trigger; an open menu takes it back.
    if (effective() === value) focusMenu(contentFor(value));
  };

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as MenubarPart | undefined;
    if (!partEl || !part) return;

    // Enter/Space on an item activate it through the one click path -- the
    // div-as-button affordance dropdown-menu documents.
    const item = partEl.closest<HTMLElement>('[data-part="item"]');
    if (item && (event.key === 'Enter' || event.key === ' ')) {
      if (isDisabledItem(item)) return;
      event.preventDefault();
      item.click();
      return;
    }

    const action = menubar.keymap(keyInputOf(event), memory.get(), part, config);
    if (!action) return;
    // preventDefault suppresses the native button click Enter/Space would
    // otherwise also fire on the trigger.
    event.preventDefault();
    if (action === 'open') {
      const value = partEl.dataset['value'];
      if (value === undefined) return;
      dispatch('open', config, value);
      // Already open (focus sat on its trigger): the key still enters the menu.
      focusMenu(contentFor(value));
      return;
    }
    if (action === 'close') {
      closeToTrigger();
      return;
    }
    dispatch(action, config, step());
  };

  const listeners: HTMLElement[] = [root, ...contents];
  for (const el of listeners) {
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKeydown);
  }

  return () => {
    unsubscribe();
    openMenu?.stop();
    openMenu = null;
    stopBar();
    for (const el of listeners) {
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKeydown);
    }
    // Restore in reverse: a menu's remembered next sibling may be the menu
    // authored after it, which has to be home before this one can follow it.
    for (const { content, parent, next } of homes.toReversed()) {
      if (!parent) continue;
      parent.insertBefore(content, next?.parentNode === parent ? next : null);
    }
  };
}
