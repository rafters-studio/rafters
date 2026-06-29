/**
 * toggle-group.controller.ts - the single source of truth for toggle-group *behavior*.
 *
 * Anti-drift: written once, framework-free, against a DOM root. React, Astro, and the
 * web component render their own markup and delegate to createToggleGroup(root) - so
 * behavior can never diverge between frameworks. Thin GLUE that composes existing
 * primitives, not a reimplementation:
 *   - createSelectionGroup -> selection state (single allows toggling off; multiple holds N)
 *   - createRovingFocus    -> arrow / Home / End navigation + roving tabindex
 * The controller only adds click toggling and ARIA/data-state reflection.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - items: [data-roving-item][data-value]  (buttons inside the [role="group"] root)
 *
 * @example
 * ```ts
 * const tg = createToggleGroup(rootEl, { type: 'multiple', onChange: (v) => save(v) });
 * tg.setValue(['bold']); // programmatic (no onChange)
 * tg.destroy();
 * ```
 */
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import type { CleanupFunction } from '../../primitives/types';

export interface ToggleGroupControllerOptions {
  /** single = mutually exclusive (collapsible: re-click clears); multiple = independent toggles. */
  type: 'single' | 'multiple';
  /** Initially pressed value(s). A '' entry is treated as nothing selected. */
  initial?: string | string[];
  /** Arrow-key navigation axis. Default 'horizontal'. */
  orientation?: 'horizontal' | 'vertical';
  /** Called when the pressed set changes via user interaction (not programmatic setValue). */
  onChange?: (value: string | string[]) => void;
}

export interface ToggleGroupController {
  /** The underlying selection state cell. */
  readonly group: SelectionGroup;
  /** Programmatically set the pressed value(s). Does NOT fire onChange (for controlled sync). */
  setValue(value: string | string[]): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

/** Normalize a value to an array, dropping empty-string placeholders (single uncontrolled). */
function toValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry) => entry !== '');
}

export function createToggleGroup(
  root: HTMLElement,
  options: ToggleGroupControllerOptions,
): ToggleGroupController {
  const { type, orientation = 'horizontal', onChange } = options;
  const group = createSelectionGroup(
    type === 'multiple'
      ? { multiple: true, initial: toValues(options.initial) }
      : { collapsible: true, initial: toValues(options.initial) },
  );

  // single mode exposes a string; multiple mode exposes a string[].
  const currentValue = (): string | string[] =>
    type === 'single' ? (group.get()[0] ?? '') : group.get();

  const items = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-roving-item][data-value]'));

  // Reflect selection onto the DOM. roving-focus owns tabindex; this owns
  // aria-pressed / data-state. Fires immediately with the current value.
  const unsubscribe = group.subscribe((selected) => {
    for (const item of items()) {
      const on = item.dataset.value !== undefined && selected.includes(item.dataset.value);
      item.setAttribute('aria-pressed', String(on));
      item.setAttribute('data-state', on ? 'on' : 'off');
    }
  });

  // Arrow / Home / End navigation + roving tabindex via the shared primitive.
  // Toggle groups use manual activation (click / Space / Enter toggle the focused
  // item via the native button), so navigation only moves focus.
  const stopRoving = createRovingFocus(root, { orientation, loop: true });

  const onClick = (event: MouseEvent): void => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-roving-item][data-value]:not([disabled])',
    );
    if (item?.dataset.value !== undefined && root.contains(item)) {
      group.toggle(item.dataset.value);
      onChange?.(currentValue());
    }
  };
  root.addEventListener('click', onClick);

  return {
    group,
    setValue: (value) => {
      group.set(toValues(value));
    },
    destroy: () => {
      unsubscribe();
      stopRoving();
      root.removeEventListener('click', onClick);
    },
  };
}
