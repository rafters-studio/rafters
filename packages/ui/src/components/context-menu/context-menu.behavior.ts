import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { computePosition } from '../../primitives/collision-detector';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { createRovingFocus } from '../../primitives/roving-focus';
import { createTypeahead } from '../../primitives/typeahead';

/**
 * Context menu: the right-click popup. Same menu machinery as a dropdown --
 * a role="menu" surface of items with roving focus, typeahead, and dismissal --
 * but opened by a pointer gesture AT the cursor point rather than anchored to a
 * trigger. Replaces the imperative old/ui/context-menu.tsx effects wholesale.
 *
 * The score's state is the open axis plus the pointer point the menu opens at.
 * Which item is HIGHLIGHTED is not state here: it is ephemeral DOM state owned
 * by the roving-focus primitive (the focused item's tabindex), exactly as
 * navigation-menu keeps focus movement out of the score.
 */
export interface ContextMenuConfig {
  /** Controlled open value. Passed fresh, never stored. */
  open?: boolean | undefined;
  /** Uncontrolled seed. */
  defaultOpen?: boolean | undefined;
  /** Roving-focus wrap at the ends of the item list. Default true. */
  loop?: boolean | undefined;
  /** Flip/clamp the menu away from viewport edges. Default true. */
  avoidCollisions?: boolean | undefined;
}

export interface ContextMenuState {
  open: boolean;
  /** Viewport x the menu opened at (the right-click clientX). */
  x: number;
  /** Viewport y the menu opened at (the right-click clientY). */
  y: number;
}

export type ContextMenuActions = {
  /** Open (or reposition) the menu at a pointer point. */
  openAt: { x: number; y: number };
  /** Close the menu. */
  close: undefined;
};

export type ContextMenuPart = 'trigger' | 'content';

/** Items the roving-focus and typeahead primitives navigate. Disabled items
 *  carry data-disabled and are skipped (the primitives filter them too). */
export const MENU_ITEM_SELECTOR =
  '[role="menuitem"]:not([data-disabled]),' +
  '[role="menuitemcheckbox"]:not([data-disabled]),' +
  '[role="menuitemradio"]:not([data-disabled])';

/** The effective open value: a controlled `open` shadows intrinsic state. */
export function isContextMenuOpen(state: ContextMenuState, config: ContextMenuConfig): boolean {
  return config.open ?? state.open;
}

const contextMenuSlice: Slice<
  ContextMenuConfig,
  ContextMenuState,
  ContextMenuActions,
  ContextMenuPart
> = {
  name: 'context-menu',
  parts: {
    // The right-clickable region. Deliberately no ARIA role: a context menu is
    // summoned by a pointer gesture that has no keyboard equivalent, so the
    // oracle kept the trigger a plain element (an aria-haspopup on a
    // non-interactive host would mislead AT). data-state is the styling hook.
    trigger: {},
    // The menu surface. Present-but-hidden while closed (presence): kept in
    // light DOM so roving-focus/typeahead read it, hidden so a closed menu is
    // out of the accessibility tree.
    content: { role: 'menu', optional: true },
  },
  initialState: (config) => ({
    open: config.open ?? config.defaultOpen ?? false,
    x: 0,
    y: 0,
  }),
  actions: {
    // openAt replaces the point so a second right-click moves the menu.
    openAt: (_state, { x, y }) => ({ open: true, x, y }),
    close: (state) => ({ ...state, open: false }),
  },
  // Idempotence gate on close so a controlled consumer's callback fires once
  // per real transition. openAt is always allowed: re-opening at a new point is
  // a legitimate move, not a no-op.
  canDispatch: (state, action, config) =>
    action === 'close' ? isContextMenuOpen(state, config) : true,
  aria: (state, config) => {
    const open = isContextMenuOpen(state, config);
    return {
      trigger: { 'data-state': open ? 'open' : 'closed' },
      content: {
        'aria-orientation': 'vertical',
        'data-state': open ? 'open' : 'closed',
        hidden: open ? undefined : true,
      },
    };
  },
  // WAI-ARIA menu: Escape dismisses. The idempotence gate makes it a no-op when
  // already closed. Arrow/Home/End navigation belongs to roving-focus; printable
  // keys to typeahead; Enter/Space activation to the item click path.
  keymap: (event) => (event.key === 'Escape' ? 'close' : null),
};

export const contextMenu: BehaviorSpec<
  ContextMenuConfig,
  ContextMenuState,
  ContextMenuActions,
  ContextMenuPart
> = compose('context-menu', contextMenuSlice);

// ==================== Submenu score ====================

/**
 * A nested submenu is an independent disclosure widget, so it gets its OWN
 * behavior instance (createBehavior(contextSubMenu)) -- NOT a second cell folded
 * into the parent score. Same shape as the parent menu (a role="menu" surface of
 * items with roving and typeahead), but opened from a sub-trigger that is itself
 * a menuitem of the parent, and anchored to the RIGHT of that trigger.
 */
export interface ContextSubMenuConfig {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  loop?: boolean | undefined;
  avoidCollisions?: boolean | undefined;
}

export interface ContextSubMenuState {
  open: boolean;
}

export type ContextSubMenuActions = {
  open: undefined;
  close: undefined;
};

export type ContextSubMenuPart = 'subTrigger' | 'subContent';

export function isSubMenuOpen(state: ContextSubMenuState, config: ContextSubMenuConfig): boolean {
  return config.open ?? state.open;
}

const contextSubMenuSlice: Slice<
  ContextSubMenuConfig,
  ContextSubMenuState,
  ContextSubMenuActions,
  ContextSubMenuPart
> = {
  name: 'context-sub-menu',
  parts: {
    // The sub-trigger is a menuitem of the PARENT menu that discloses a submenu.
    subTrigger: { role: 'menuitem' },
    subContent: { role: 'menu', optional: true },
  },
  initialState: (config) => ({ open: config.open ?? config.defaultOpen ?? false }),
  actions: {
    open: () => ({ open: true }),
    close: () => ({ open: false }),
  },
  canDispatch: (state, action, config) =>
    action === 'open' ? !isSubMenuOpen(state, config) : isSubMenuOpen(state, config),
  aria: (state, config, ids) => {
    const open = isSubMenuOpen(state, config);
    return {
      subTrigger: {
        'aria-haspopup': 'menu',
        'aria-expanded': open ? 'true' : 'false',
        // Empty-id sentinel: reference the content only when its id is real.
        'aria-controls': open && ids.subContent ? ids.subContent : undefined,
        'data-state': open ? 'open' : 'closed',
      },
      subContent: {
        'aria-orientation': 'vertical',
        'data-state': open ? 'open' : 'closed',
        // No `hidden` toggle here (unlike the parent menu's content, #2152):
        // the submenu reveal is CSS opacity/scale over `:hover`/`:focus-within`
        // and `data-state`, and `hidden` (display:none) would defeat both --
        // a hidden node cannot transition, so it can never fade or scale in.
      },
    };
  },
  // WAI-ARIA submenu keyboard: ArrowRight (or Enter/Space) on the trigger opens
  // and enters; ArrowLeft or Escape from the content closes back to the trigger.
  keymap: (event, _state, part) => {
    if (
      part === 'subTrigger' &&
      (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ')
    ) {
      return 'open';
    }
    if (part === 'subContent' && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
      return 'close';
    }
    return null;
  },
};

export const contextSubMenu: BehaviorSpec<
  ContextSubMenuConfig,
  ContextSubMenuState,
  ContextSubMenuActions,
  ContextSubMenuPart
> = compose('context-sub-menu', contextSubMenuSlice);

/** Apply a resolved aria projection to an element (validate:false skips the
 *  author-input coercion that would flip a projected 'false'). */
function applyProjection(el: HTMLElement, attrs: AriaAttrs): void {
  for (const [name, value] of Object.entries(attrs)) {
    updateAriaAttribute(el, name as never, value as never, { validate: false });
  }
}

/**
 * Position the menu at the pointer point via the collision-detector primitive,
 * treating the point as a zero-size anchor. side='bottom' align='start' places
 * the menu's top-left corner at the cursor (the context-menu convention);
 * avoidCollisions flips/clamps it away from the viewport edges. Positioning uses
 * left/top (not transform) so the enter transform (scale) stays free for motion.
 * Shared by every client so the placement decision lives in ONE place.
 */
export function positionContextMenuContent(
  content: HTMLElement,
  point: { x: number; y: number },
  config: ContextMenuConfig,
): void {
  const result = computePosition(point, content, {
    side: 'bottom',
    align: 'start',
    avoidCollisions: config.avoidCollisions ?? true,
  });
  content.style.position = 'fixed';
  content.style.left = `${Math.round(result.x)}px`;
  content.style.top = `${Math.round(result.y)}px`;
}

/** Focus the first enabled item -- the menu opens with keyboard focus inside it
 *  (WAI-ARIA menu). */
function focusFirstItem(content: HTMLElement): void {
  content.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
}

/** The parts/config the roving/typeahead/dismiss trio composes against. */
export interface ContextMenuEffectPorts {
  /** The menu surface: roving-focus and typeahead drive its items; an outside
   *  pointerdown beyond it dismisses. */
  content: HTMLElement;
  /** Roving-focus wrap. */
  loop: boolean;
  /** Dismiss request (outside pointerdown). */
  onDismiss: () => void;
}

/**
 * The context-menu DOM trio, composed directly from the primitives: roving
 * tabindex down the item list, type-to-search over the items, and
 * outside-pointerdown dismissal. Started on the open transition and torn down on
 * close by BOTH bindContextMenu and the React client's effect -- one instance
 * per open, cleanup releases LIFO. Escape is NOT here: it rides the score's
 * keymap (Spec 05 canonical dismissal), so the pure behavior test covers it.
 */
export function startContextMenuEffects({
  content,
  loop,
  onDismiss,
}: ContextMenuEffectPorts): () => void {
  const releaseRoving = createRovingFocus(content, { orientation: 'vertical', loop });
  const releaseTypeahead = createTypeahead(content, {
    getItems: () => content.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR),
    onMatch: (item) => item.focus(),
  });
  const releaseDismiss = onPointerDownOutside(content, (event) => {
    // An open submenu's content portals OUT of `content`, so a pointerdown
    // inside it reads as "outside" -- spare it, or opening a submenu would
    // dismiss the whole menu.
    if ((event.target as HTMLElement).closest?.('[data-part="sub-content"]')) return;
    onDismiss();
  });
  return () => {
    releaseDismiss();
    releaseTypeahead();
    releaseRoving();
  };
}

/**
 * Anchor a submenu's content to the RIGHT of its sub-trigger via the
 * collision-detector primitive (flipping to the left near the viewport edge).
 * left/top positioning, shared by every client.
 */
export function positionSubContent(
  subTrigger: HTMLElement,
  subContent: HTMLElement,
  config: ContextSubMenuConfig,
): void {
  const result = computePosition(subTrigger, subContent, {
    side: 'right',
    align: 'start',
    avoidCollisions: config.avoidCollisions ?? true,
  });
  subContent.style.position = 'fixed';
  subContent.style.left = `${Math.round(result.x)}px`;
  subContent.style.top = `${Math.round(result.y)}px`;
}

/** Roving + typeahead over a submenu's items. Dismissal is NOT here: the parent
 *  owns whole-tree outside-dismiss, and the submenu closes via ArrowLeft/Escape
 *  or hover-leave. Shared by the bind and the React client. */
export function startContextSubMenuEffects(subContent: HTMLElement, loop: boolean): () => void {
  const releaseRoving = createRovingFocus(subContent, { orientation: 'vertical', loop });
  const releaseTypeahead = createTypeahead(subContent, {
    getItems: () => subContent.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR),
    onMatch: (item) => item.focus(),
  });
  return () => {
    releaseTypeahead();
    releaseRoving();
  };
}

/** A live submenu binding: its teardown, plus a `close` the parent calls to
 *  collapse the whole tree when it closes or an item is selected. */
export interface SubMenuBinding {
  teardown: () => void;
  close: () => void;
}

/** The submenus that are DIRECT children of `container` -- those with no other
 *  [data-part="sub"] between them and it. Each binding recurses into its own
 *  content, so binding the direct ones binds the whole tree exactly once. */
export function directSubMenus(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-part="sub"]')).filter((el) => {
    const ancestorSub = el.parentElement?.closest<HTMLElement>('[data-part="sub"]') ?? null;
    return ancestorSub === null || !container.contains(ancestorSub);
  });
}

/**
 * Bind ONE submenu (recursing into nested submenus). The sub-content is moved to
 * document.body on bind so it escapes the parent's `overflow-hidden` AND leaves
 * the parent's roving/keyboard scope (nested menuitems would otherwise pollute
 * the parent's item list). Opens on ArrowRight/Enter/Space/click or hover-intent,
 * closes on ArrowLeft/Escape/hover-leave; selecting an item calls `onSelect` to
 * collapse the whole tree.
 */
export function bindContextSubMenu(
  subEl: HTMLElement,
  options: { onSelect: () => void },
): SubMenuBinding {
  const subTrigger = subEl.querySelector<HTMLElement>('[data-part="sub-trigger"]');
  const subContent = subEl.querySelector<HTMLElement>('[data-part="sub-content"]');
  if (!subTrigger || !subContent) return { teardown: () => {}, close: () => {} };

  // Config travels as `data-*` and nothing else (#2001) -- `loop` and
  // `avoid-collisions` are not valid attributes on a <div>, and only `data-*`
  // reaches `dataset`.
  const config: ContextSubMenuConfig = {
    loop: subEl.dataset['loop'] !== 'false',
    avoidCollisions: subEl.dataset['avoidCollisions'] !== 'false',
  };

  // Move the sub-content out of the parent menu (see doc above). The original
  // parent is remembered so unbind can restore the markup.
  const parent = subContent.parentElement;
  const nextSibling = subContent.nextSibling;
  document.body.appendChild(subContent);

  const { memory, dispatch } = createBehavior(contextSubMenu, config);
  const request = (action: keyof ContextSubMenuActions): boolean => dispatch(action, config);

  const ids = {
    subTrigger: subTrigger.id,
    subContent: subContent.id,
  } as PartIds<ContextSubMenuPart>;

  // Nested submenus live inside THIS sub-content -- bind the direct ones (each
  // recurses) with the same whole-tree onSelect so a deep selection collapses
  // everything.
  const nested: SubMenuBinding[] = directSubMenus(subContent).map((child) =>
    bindContextSubMenu(child, options),
  );

  let stopEffects: (() => void) | null = null;
  let prevOpen = isSubMenuOpen(memory.get(), config);

  const render = () => {
    const state = memory.get();
    const open = isSubMenuOpen(state, config);
    const projection = contextSubMenu.aria(state, config, ids);
    applyProjection(subTrigger, projection.subTrigger ?? {});
    applyProjection(subContent, projection.subContent ?? {});
    if (open) {
      positionSubContent(subTrigger, subContent, config);
      if (!stopEffects) stopEffects = startContextSubMenuEffects(subContent, config.loop ?? true);
      if (!prevOpen) focusFirstItem(subContent);
    } else {
      stopEffects?.();
      stopEffects = null;
      if (prevOpen) subTrigger.focus();
    }
    prevOpen = open;
  };
  const unsubscribe = memory.subscribe(render);

  // Hover open/close is a direct, undelayed state update (#2152): the visual
  // reveal's hover-intent delay is a CSS `transition-delay` on the sub-content
  // rule (context-menu.classes.ts, consuming `--rafters-delay-hover-intent`),
  // not a JS timer. `data-state` and aria-expanded flip the instant the pointer
  // crosses the boundary; the stylesheet decides when that becomes visible.
  const onTriggerEnter = () => void request('open');
  const onTriggerLeave = () => void request('close');
  const onTriggerClick = (event: Event) => {
    event.stopPropagation();
    request('open');
  };
  const onTriggerKeydown = (event: KeyboardEvent) => {
    const action = contextSubMenu.keymap(keyInput(event), memory.get(), 'subTrigger', config);
    if (action === 'open') {
      event.preventDefault();
      event.stopPropagation();
      request('open');
    }
  };
  // Re-asserts open if the pointer lands on the panel after a premature close
  // (the panel sits flush against the trigger, zero `sideOffset`, but a fast
  // or diagonal crossing can still land outside both boxes for an instant).
  // `canDispatch` no-ops an already-open request, so this is safe when the
  // panel never actually closed. Mirrors React's `ContextMenuSubContent`
  // `onPointerEnter` (context-menu.tsx) -- one score, three performances, so
  // the DOM-native bind keeps the same recovery path.
  const onContentEnter = () => void request('open');
  const onContentLeave = () => void request('close');
  const onContentKeydown = (event: KeyboardEvent) => {
    const action = contextSubMenu.keymap(keyInput(event), memory.get(), 'subContent', config);
    if (action === 'close') {
      event.preventDefault();
      event.stopPropagation();
      request('close');
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
      if (item && subContent.contains(item) && !item.closest('[data-part="sub-trigger"]')) {
        event.preventDefault();
        item.click();
      }
    }
  };
  const onContentClick = (event: Event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
    // A nested sub-trigger click is handled by its own binding, not a selection.
    if (item && subContent.contains(item) && !item.closest('[data-part="sub-trigger"]')) {
      options.onSelect();
    }
  };

  subTrigger.addEventListener('pointerenter', onTriggerEnter);
  subTrigger.addEventListener('pointerleave', onTriggerLeave);
  subTrigger.addEventListener('click', onTriggerClick);
  subTrigger.addEventListener('keydown', onTriggerKeydown);
  subContent.addEventListener('pointerenter', onContentEnter);
  subContent.addEventListener('pointerleave', onContentLeave);
  subContent.addEventListener('keydown', onContentKeydown);
  subContent.addEventListener('click', onContentClick);

  return {
    // Collapse the whole subtree: close nested children BEFORE this level, so a
    // grandchild is never orphaned open when an ancestor closes (the parent's
    // cascade and the select-an-item path both call this). React is exempt --
    // its ContextMenuSubContent unmounts the nested subtree via usePresence.
    close: () => {
      for (const child of nested) child.close();
      request('close');
    },
    teardown: () => {
      unsubscribe();
      stopEffects?.();
      stopEffects = null;
      for (const binding of nested) binding.teardown();
      subTrigger.removeEventListener('pointerenter', onTriggerEnter);
      subTrigger.removeEventListener('pointerleave', onTriggerLeave);
      subTrigger.removeEventListener('click', onTriggerClick);
      subTrigger.removeEventListener('keydown', onTriggerKeydown);
      subContent.removeEventListener('pointerenter', onContentEnter);
      subContent.removeEventListener('pointerleave', onContentLeave);
      subContent.removeEventListener('keydown', onContentKeydown);
      subContent.removeEventListener('click', onContentClick);
      // Restore the sub-content to its authored position in the markup.
      if (parent) parent.insertBefore(subContent, nextSibling);
    },
  };
}

/** Minimal KeyInput from a native KeyboardEvent (the score's keymap contract). */
function keyInput(event: KeyboardEvent): {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
} {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

/**
 * The DOM-native binding of the score -- the client the Web Component and the
 * Astro <script> both import. Only React (retained-mode) reads the projections
 * declaratively instead. Composes the substrate the same way the React client
 * does: createBehavior is the model, startContextMenuEffects composes the
 * roving/typeahead/dismiss primitives on open, aria-manager applies the
 * projection, and the DOM is the part registry.
 */
export function bindContextMenu(root: HTMLElement): () => void {
  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const content = getPart('content');
  // Config travels as `data-*` and nothing else (#2001) -- see bindContextSubMenu.
  const config: ContextMenuConfig = {
    defaultOpen: root.dataset['defaultOpen'] === 'true' || content?.dataset['state'] === 'open',
    loop: root.dataset['loop'] !== 'false',
    avoidCollisions: root.dataset['avoidCollisions'] !== 'false',
  };

  const { memory, dispatch } = createBehavior(contextMenu, config);
  const request = (action: keyof ContextMenuActions, payload?: { x: number; y: number }): boolean =>
    dispatch(
      action,
      config,
      ...((payload === undefined ? [] : [payload]) as [{ x: number; y: number }]),
    );

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<ContextMenuPart>;
  for (const part of Object.keys(contextMenu.parts) as ContextMenuPart[])
    ids[part] = getPart(part)?.id ?? '';

  const trigger = getPart('trigger');

  // Bind the top-level submenus (each recurses). Selecting a submenu item
  // collapses the whole menu via the parent's close.
  const subs: SubMenuBinding[] = content
    ? directSubMenus(content).map((el) =>
        bindContextSubMenu(el, { onSelect: () => request('close') }),
      )
    : [];

  let stopEffects: (() => void) | null = null;
  let prevOpen = isContextMenuOpen(memory.get(), config);

  const render = () => {
    const state = memory.get();
    const open = isContextMenuOpen(state, config);
    const projection = contextMenu.aria(state, config, ids);
    for (const part of Object.keys(projection) as ContextMenuPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    if (content) {
      if (open) {
        positionContextMenuContent(content, { x: state.x, y: state.y }, config);
        if (!stopEffects) {
          stopEffects = startContextMenuEffects({
            content,
            loop: config.loop ?? true,
            onDismiss: () => request('close'),
          });
        }
        // One-shot on the closed->open edge: move focus into the menu.
        if (!prevOpen) focusFirstItem(content);
      } else {
        stopEffects?.();
        stopEffects = null;
        // Collapse any open submenu with the parent, and restore focus to the
        // trigger on the open->close edge.
        if (prevOpen) {
          for (const sub of subs) sub.close();
          trigger?.focus();
        }
      }
    }
    prevOpen = open;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Right-click summons the menu at the pointer point. preventDefault suppresses
  // the native browser context menu.
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    request('openAt', { x: event.clientX, y: event.clientY });
  };
  trigger?.addEventListener('contextmenu', onContextMenu);

  // Escape dismisses through the score's keymap; Enter/Space activates a focused
  // item (native <div> items do not emit a click), and the click path
  // selects-and-closes.
  const onKeydown = (event: KeyboardEvent) => {
    const action = contextMenu.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      'content',
      config,
    );
    if (action === 'close' && isContextMenuOpen(memory.get(), config)) {
      event.preventDefault();
      request('close');
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
      if (item && content?.contains(item)) {
        event.preventDefault();
        item.click();
      }
    }
  };
  content?.addEventListener('keydown', onKeydown);

  // Selecting any item closes the menu (the menu-collection contract).
  const onClick = (event: MouseEvent) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(MENU_ITEM_SELECTOR);
    if (item && content?.contains(item)) request('close');
  };
  content?.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    stopEffects?.();
    stopEffects = null;
    for (const sub of subs) sub.teardown();
    trigger?.removeEventListener('contextmenu', onContextMenu);
    content?.removeEventListener('keydown', onKeydown);
    content?.removeEventListener('click', onClick);
  };
}
