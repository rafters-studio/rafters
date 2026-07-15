/**
 * navigation-menu.controller.ts - the single source of truth for navigation-menu
 * *behavior*.
 *
 * Anti-drift: written once, framework-free, against a DOM root. React, Astro, and a
 * future web component render their own markup and delegate to createNavigationMenu(root).
 * Thin GLUE composing existing primitives, not a reimplementation:
 *   - createSelectionGroup({ collapsible: true }) -> which top-level item is open
 *     (single, closable; one menu open at a time)
 *   - createRovingFocus(root, { orientation }) -> arrow / Home / End across triggers
 *     + roving tabindex
 *   - createDismissableLayer -> Escape + outside pointer-down close the open menu
 * The controller only adds click toggling, keyboard open (Enter/Space/ArrowDown),
 * pointer hover-intent (delayed open, immediate switch while open, delayed close),
 * and ARIA / visibility reflection.
 *
 * Hover-intent is handled here with pointerenter/pointerleave rather than the
 * createHoverDelay primitive: that primitive keys off mouse events and tracks a single
 * trigger/content pair, whereas a menubar needs cross-item immediate switching (moving
 * between open triggers opens the next one with no delay) and a shared close timer that
 * spans the gap between a trigger and its content.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - triggers: [data-nav-trigger][data-value]  inside the root
 *   - content:  [data-nav-content][data-value]   (one per trigger value)
 *   - viewport: [data-nav-viewport]              (optional decorative chrome)
 *
 * @example
 * ```ts
 * const nav = createNavigationMenu(rootEl, {
 *   delayDuration: 200,
 *   onChange: (v) => save(v),
 * });
 * nav.setValue('products'); // programmatic (no onChange)
 * nav.destroy();
 * ```
 */
import { createDismissableLayer } from '../../primitives/dismissable-layer';
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import type { CleanupFunction } from '../../primitives/types';

export interface NavigationMenuControllerOptions {
  /** Initially open item value. */
  initial?: string;
  /** Arrow-key navigation orientation across the top-level triggers. */
  orientation?: 'horizontal' | 'vertical';
  /** Delay (ms) before hover opens / closes a menu. */
  delayDuration?: number;
  /** Called when the open item changes via user interaction (not programmatic setValue). */
  onChange?: (value: string) => void;
}

export interface NavigationMenuController {
  /** The underlying selection state cell (holds 0 or 1 open value). */
  readonly group: SelectionGroup;
  /** Programmatically set the open item ('' closes). Does NOT fire onChange. */
  setValue(value: string): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

export function createNavigationMenu(
  root: HTMLElement,
  options: NavigationMenuControllerOptions = {},
): NavigationMenuController {
  const { orientation = 'horizontal', delayDuration = 200, onChange } = options;
  // One menu open at a time, and the open one is closable -> single + collapsible. An
  // empty-string initial means "nothing open" - never seed the group with [''].
  const initial =
    options.initial === undefined || options.initial === '' ? undefined : options.initial;
  const group = createSelectionGroup(
    initial === undefined ? { collapsible: true } : { collapsible: true, initial },
  );

  const triggers = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-nav-trigger]'));

  // Reflect the open item onto the DOM. roving-focus owns tabindex; this owns
  // aria-expanded / data-state on triggers and hidden / data-state / aria-hidden on
  // content (and the viewport). Fires immediately on subscribe (before paint).
  const unsubscribe = group.subscribe((selected) => {
    const active = selected[0];
    for (const trigger of triggers()) {
      const open = trigger.dataset.value === active;
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('data-state', open ? 'open' : 'closed');
    }
    for (const content of root.querySelectorAll<HTMLElement>('[data-nav-content]')) {
      const open = content.dataset.value === active;
      content.hidden = !open;
      content.setAttribute('data-state', open ? 'open' : 'closed');
      content.setAttribute('aria-hidden', String(!open));
      // Own the inline hide-state so an opened panel becomes visible even though React
      // server-rendered visibility:hidden / height:0 for the initially-closed panel.
      if (open) {
        content.style.removeProperty('visibility');
        content.style.removeProperty('height');
        content.style.removeProperty('overflow');
      } else {
        content.style.visibility = 'hidden';
        content.style.height = '0';
        content.style.overflow = 'hidden';
      }
    }
    for (const viewport of root.querySelectorAll<HTMLElement>('[data-nav-viewport]')) {
      const open = active !== undefined;
      viewport.setAttribute('data-state', open ? 'open' : 'closed');
      viewport.setAttribute('aria-hidden', String(!open));
    }
  });

  const open = (value: string): void => {
    group.select(value);
    onChange?.(value);
  };
  const close = (): void => {
    group.clear();
    onChange?.('');
  };
  const toggle = (value: string): void => {
    if (group.isSelected(value)) {
      close();
    } else {
      open(value);
    }
  };

  // Arrow / Home / End across the top-level triggers + roving tabindex via the shared
  // primitive. Navigation only moves focus (manual activation), so it does not open.
  const stopRoving = createRovingFocus(root, { orientation });

  // Click toggles the menu; Enter/Space toggle; ArrowDown opens (when closed).
  const onClick = (event: MouseEvent): void => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-nav-trigger]:not([disabled])',
    );
    if (trigger?.dataset.value) {
      toggle(trigger.dataset.value);
      trigger.focus();
    }
  };
  root.addEventListener('click', onClick);

  const onKeyDown = (event: KeyboardEvent): void => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-nav-trigger]:not([disabled])',
    );
    const value = trigger?.dataset.value;
    if (!value) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(value);
    } else if (event.key === 'ArrowDown' && !group.isSelected(value)) {
      // Vertical roving (orientation === 'vertical') owns ArrowDown for focus; only
      // hijack it to open when arrows move horizontally across the triggers.
      if (orientation !== 'vertical') {
        event.preventDefault();
        open(value);
      }
    }
  };
  root.addEventListener('keydown', onKeyDown);

  // Hover-intent. A single open timer (per pending trigger) and a single shared close
  // timer let the pointer travel from a trigger to its content without closing, and let
  // moving between already-open triggers switch immediately.
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const clearOpenTimer = (): void => {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = undefined;
    }
  };
  const clearCloseTimer = (): void => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  };

  const onPointerEnter = (event: PointerEvent): void => {
    const target = event.target as HTMLElement;
    const trigger = target.closest<HTMLElement>('[data-nav-trigger]:not([disabled])');
    const insideContent = target.closest<HTMLElement>('[data-nav-content]');
    clearCloseTimer();
    if (insideContent) return; // hovering content keeps the current menu open
    const value = trigger?.dataset.value;
    if (!value) return;
    if (group.get().length > 0) {
      // A menu is already open: switch to the hovered trigger immediately.
      clearOpenTimer();
      if (!group.isSelected(value)) open(value);
    } else if (!group.isSelected(value)) {
      clearOpenTimer();
      openTimer = setTimeout(() => open(value), delayDuration);
    }
  };

  const onPointerLeave = (event: PointerEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-nav-trigger], [data-nav-content]')) return;
    clearOpenTimer();
    closeTimer = setTimeout(() => {
      if (group.get().length > 0) close();
    }, delayDuration);
  };
  root.addEventListener('pointerenter', onPointerEnter, true);
  root.addEventListener('pointerleave', onPointerLeave, true);

  // Escape + outside pointer-down close the open menu. Escape additionally returns
  // focus to the trigger that was open.
  const stopDismiss = createDismissableLayer(root, {
    onEscapeKeyDown: () => {
      const active = group.get()[0];
      if (active) {
        const trigger = root.querySelector<HTMLElement>(
          `[data-nav-trigger][data-value="${active}"]`,
        );
        close();
        trigger?.focus();
      }
    },
    onPointerDownOutside: () => {
      if (group.get().length > 0) close();
    },
  });

  return {
    group,
    setValue: (value) => {
      group.set(value === '' ? [] : [value]);
    },
    destroy: () => {
      clearOpenTimer();
      clearCloseTimer();
      unsubscribe();
      stopRoving();
      stopDismiss();
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('pointerenter', onPointerEnter, true);
      root.removeEventListener('pointerleave', onPointerLeave, true);
    },
  };
}
