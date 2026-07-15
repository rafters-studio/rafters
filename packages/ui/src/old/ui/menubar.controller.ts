/**
 * menubar.controller.ts - the single source of truth for menubar *behavior*.
 *
 * Anti-drift: written once, framework-free, against a DOM root. React, Astro, and
 * a future web component render their own markup and delegate to createMenubar(root),
 * so behavior cannot diverge between frameworks. Thin GLUE composing existing
 * primitives, not a reimplementation:
 *   - createSelectionGroup({ collapsible: true }) -> which top-level menu is open
 *     (one at a time, closable).
 *   - createRovingFocus(root, { orientation: 'horizontal' }) -> Arrow Left/Right +
 *     Home/End + roving tabindex across the top-level menu triggers.
 *   - createRovingFocus(content, { orientation: 'vertical' }) -> Arrow Up/Down within
 *     the open menu's items.
 *   - createTypeahead(content) -> type-to-focus within the open menu.
 *   - onPointerDownOutside + onEscapeKeyDown -> dismiss the open menu.
 * The controller adds click/hover activation and ARIA/visibility reflection.
 *
 * Inactive menu content stays MOUNTED but hidden (hidden + data-state="closed"),
 * mirroring tabs/accordion. Only the active menu's content is visible.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - triggers: [data-menubar-trigger][data-value]  (role="menuitem", inside role="menubar")
 *   - content:  [data-menubar-content][data-value]   (role="menu")
 *
 * @example
 * ```ts
 * const menubar = createMenubar(rootEl, { loop: true, onValueChange: (v) => save(v) });
 * menubar.setValue('file'); // programmatic open (no onValueChange)
 * menubar.setValue('');     // programmatic close
 * menubar.destroy();
 * ```
 */
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import { createTypeahead } from '../../primitives/typeahead';
import type { CleanupFunction } from '../../primitives/types';

const ITEM_SELECTOR =
  '[role="menuitem"]:not([disabled]):not([data-disabled]), [role="menuitemcheckbox"]:not([disabled]):not([data-disabled]), [role="menuitemradio"]:not([disabled]):not([data-disabled])';

export interface MenubarControllerOptions {
  /** Loop arrow navigation across triggers and within menus. Default true. */
  loop?: boolean;
  /** Initially open menu value (empty = all closed). */
  initial?: string;
  /** Called when the open menu changes via user interaction (not programmatic setValue). */
  onValueChange?: (value: string) => void;
}

export interface MenubarController {
  /** The underlying selection state cell (0 or 1 open menu value). */
  readonly group: SelectionGroup;
  /** Programmatically set the open menu (empty string closes). Does NOT fire onValueChange. */
  setValue(value: string): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

export function createMenubar(
  root: HTMLElement,
  options: MenubarControllerOptions = {},
): MenubarController {
  const { loop = true, onValueChange } = options;
  const group = createSelectionGroup({
    collapsible: true,
    ...(options.initial === undefined ? {} : { initial: options.initial }),
  });

  const triggers = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-menubar-trigger]'));
  const contents = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-menubar-content]'));
  const triggerFor = (value: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-menubar-trigger][data-value="${CSS.escape(value)}"]`);
  const contentFor = (value: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-menubar-content][data-value="${CSS.escape(value)}"]`);

  // Per-open-menu behavior (roving focus + typeahead + dismiss) is mounted on open
  // and torn down on close. This holds the teardown for the currently open menu.
  let openCleanup: CleanupFunction | null = null;

  const teardownOpenMenu = (): void => {
    openCleanup?.();
    openCleanup = null;
  };

  // Wire the behavior for a freshly opened menu's content element. Returns cleanup.
  const setupOpenMenu = (content: HTMLElement): CleanupFunction => {
    const stopRoving = createRovingFocus(content, { orientation: 'vertical', loop });
    const stopTypeahead = createTypeahead(content, {
      getItems: () => content.querySelectorAll<HTMLElement>(ITEM_SELECTOR),
      onMatch: (item) => item.focus(),
    });
    const stopEscape = onEscapeKeyDown((event) => {
      if (event.defaultPrevented) return;
      const value = group.get()[0];
      group.clear();
      onValueChange?.('');
      if (value) triggerFor(value)?.focus();
    });
    const stopOutside = onPointerDownOutside(content, (event) => {
      const target = event.target as Node;
      // A click on any menubar trigger is handled by the click delegate (it switches
      // or toggles menus); do not also dismiss here.
      for (const trigger of triggers()) {
        if (trigger.contains(target)) return;
      }
      group.clear();
      onValueChange?.('');
    });

    // Keep in-menu navigation keys from bubbling to the menubar's horizontal roving
    // (Home/End are handled by both orientations). Roving's own listener, registered
    // first on this same element, has already run, so focus has already moved; this
    // only prevents the ancestor menubar from also acting. preventDefault is left to
    // roving. Runs in bubble phase after roving.
    const stopBubble = (event: KeyboardEvent): void => {
      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.stopPropagation();
      }
    };
    content.addEventListener('keydown', stopBubble);

    // Focus the first item once the content is visible.
    const firstItem = content.querySelector<HTMLElement>(ITEM_SELECTOR);
    firstItem?.focus();

    return () => {
      stopRoving();
      stopTypeahead();
      stopEscape();
      stopOutside();
      content.removeEventListener('keydown', stopBubble);
    };
  };

  // Reflect open state onto the DOM. roving-focus (on the menubar) owns trigger
  // tabindex; this owns aria-expanded / data-state on triggers and hidden /
  // data-state on contents, plus mounting per-menu behavior. Fires immediately.
  const unsubscribe = group.subscribe((selected) => {
    const active = selected[0];
    for (const trigger of triggers()) {
      const on = trigger.dataset.value === active;
      trigger.setAttribute('aria-expanded', String(on));
      trigger.setAttribute('data-state', on ? 'open' : 'closed');
    }
    for (const content of contents()) {
      const on = content.dataset.value === active;
      content.hidden = !on;
      content.setAttribute('data-state', on ? 'open' : 'closed');
    }

    // Re-wire per-menu behavior for the newly active menu.
    teardownOpenMenu();
    if (active) {
      const content = contentFor(active);
      if (content) openCleanup = setupOpenMenu(content);
    }
  });

  // Horizontal arrow navigation + roving tabindex across triggers. Moving focus
  // does NOT open a menu (menus use manual activation); but if a menu is already
  // open, navigating to another trigger switches the open menu to follow focus.
  const startIndex = Math.max(
    0,
    triggers().findIndex((trigger) => trigger.dataset.value === group.get()[0]),
  );
  const stopRovingTriggers = createRovingFocus(root, {
    orientation: 'horizontal',
    loop,
    currentIndex: startIndex,
    onNavigate: (element) => {
      const value = element.dataset.value;
      if (value === undefined) return;
      if (group.get().length > 0 && group.get()[0] !== value) {
        group.select(value);
        onValueChange?.(value);
      }
    },
  });

  // Set when a pointerover switched menus, so the click that often accompanies the same
  // pointer interaction does not immediately toggle the just-opened menu closed.
  let openedByHover = false;

  const onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;

    // Trigger click: toggle this menu open/closed. Opening focuses the first item
    // (done by the subscribe handler); closing returns focus to the trigger. If this
    // menu was just opened by hover, the click keeps it open instead of toggling.
    const trigger = target.closest<HTMLElement>('[data-menubar-trigger]:not([disabled])');
    if (trigger?.dataset.value !== undefined) {
      const value = trigger.dataset.value;
      if (openedByHover && group.get()[0] === value) {
        openedByHover = false;
        return;
      }
      openedByHover = false;
      group.toggle(value);
      onValueChange?.(group.get()[0] ?? '');
      if (group.get()[0] !== value) trigger.focus();
      return;
    }

    // Item click inside an open menu: selecting a (non-disabled) item closes the menu
    // and returns focus to the trigger. data-disabled items are ignored.
    const item = target.closest<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
    );
    if (item && !item.hasAttribute('data-disabled')) {
      const value = group.get()[0];
      group.clear();
      onValueChange?.('');
      if (value) triggerFor(value)?.focus();
    }
  };
  root.addEventListener('click', onClick);

  // While a menu is open, hovering a different top-level trigger switches the open
  // menu to follow the pointer (desktop-menubar convention). Hover does NOT open the
  // first menu - that requires an explicit click / keyboard activation.
  const onPointerOver = (event: PointerEvent): void => {
    if (group.get().length === 0) return;
    const trigger = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-menubar-trigger]:not([disabled])',
    );
    if (trigger?.dataset.value !== undefined && group.get()[0] !== trigger.dataset.value) {
      const value = trigger.dataset.value;
      openedByHover = true;
      group.select(value);
      onValueChange?.(value);
      trigger.focus();
    }
  };
  root.addEventListener('pointerover', onPointerOver);

  // Open the menu when a focused trigger receives ArrowDown / Enter / Space, and
  // close + activate an item when Enter / Space is pressed on a focused item.
  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;

    const trigger = target.closest<HTMLElement>('[data-menubar-trigger]:not([disabled])');
    if (trigger?.dataset.value !== undefined) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const value = trigger.dataset.value;
        if (group.get()[0] !== value) {
          group.select(value);
          onValueChange?.(value);
        }
      }
      return;
    }

    // Inside an open menu, Enter/Space on an item activates it (click handles the
    // selection side-effect; here we just synthesize the click for keyboard users).
    if (event.key === 'Enter' || event.key === ' ') {
      const item = target.closest<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      );
      if (item && !item.hasAttribute('data-disabled')) {
        event.preventDefault();
        item.click();
      }
    }
  };
  root.addEventListener('keydown', onKeyDown);

  return {
    group,
    setValue: (value) => {
      group.set(value === '' ? [] : [value]);
    },
    destroy: () => {
      teardownOpenMenu();
      unsubscribe();
      stopRovingTriggers();
      root.removeEventListener('click', onClick);
      root.removeEventListener('pointerover', onPointerOver);
      root.removeEventListener('keydown', onKeyDown);
    },
  };
}
