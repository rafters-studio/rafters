/**
 * tabs.controller.ts - the single source of truth for tab *behavior*.
 *
 * Anti-drift mechanism: tab interaction is written ONCE here, framework-free,
 * against a DOM root. React, Astro, and a future web component render their own
 * markup and delegate runtime behavior to createTabs(root) - so behavior can
 * never diverge between frameworks.
 *
 * This is thin GLUE that composes existing primitives, not a reimplementation:
 *   - createSelectionGroup -> selection state (which tab is active)
 *   - createRovingFocus    -> arrow / Home / End navigation + roving tabindex
 *                             (orientation, loop, RTL, disabled/hidden handling)
 * The controller only adds click activation and ARIA/visibility reflection.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - triggers: [role="tab"][data-value]  inside a [role="tablist"]
 *   - panels:   [role="tabpanel"][data-value]
 *
 * @example
 * ```ts
 * const tabs = createTabs(rootEl, { initial: 'overview', onChange: (v) => save(v) });
 * tabs.setValue('details'); // programmatic (no onChange)
 * tabs.destroy();
 * ```
 */
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import type { CleanupFunction } from '../../primitives/types';

export interface TabsControllerOptions {
  /** Initially active tab value. */
  initial?: string;
  /** Called when the active tab changes via user interaction (not programmatic setValue). */
  onChange?: (value: string) => void;
}

export interface TabsController {
  /** The underlying selection state cell. */
  readonly group: SelectionGroup;
  /** Programmatically set the active tab. Does NOT fire onChange (for controlled sync). */
  setValue(value: string): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

export function createTabs(root: HTMLElement, options: TabsControllerOptions = {}): TabsController {
  const { onChange } = options;
  const group = createSelectionGroup(
    options.initial === undefined ? {} : { initial: options.initial },
  );

  const triggers = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));

  // Reflect selection onto the DOM. roving-focus owns tabindex; this owns
  // aria-selected / data-state and panel visibility. Fires immediately.
  const unsubscribe = group.subscribe((selected) => {
    const active = selected[0];
    for (const tab of triggers()) {
      const on = tab.dataset.value === active;
      tab.setAttribute('aria-selected', String(on));
      tab.setAttribute('data-state', on ? 'active' : 'inactive');
    }
    for (const panel of root.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
      const on = panel.dataset.value === active;
      panel.hidden = !on;
      panel.setAttribute('data-state', on ? 'active' : 'inactive');
    }
  });

  const activate = (value: string): void => {
    group.select(value);
    onChange?.(value);
  };

  // Keyboard + roving tabindex via the shared primitive. Tabs use automatic
  // activation: moving focus activates the tab. Start focus on the active tab.
  const list = root.querySelector<HTMLElement>('[role="tablist"]') ?? root;
  const startIndex = Math.max(
    0,
    triggers().findIndex((tab) => tab.dataset.value === group.get()[0]),
  );
  const stopRoving = createRovingFocus(list, {
    orientation: 'horizontal',
    currentIndex: startIndex,
    onNavigate: (element) => {
      if (element.dataset.value) activate(element.dataset.value);
    },
  });

  const onClick = (event: MouseEvent): void => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]:not([disabled])');
    if (tab?.dataset.value) {
      activate(tab.dataset.value);
      tab.focus();
    }
  };
  root.addEventListener('click', onClick);

  return {
    group,
    setValue: (value) => {
      group.select(value);
    },
    destroy: () => {
      unsubscribe();
      stopRoving();
      root.removeEventListener('click', onClick);
    },
  };
}
