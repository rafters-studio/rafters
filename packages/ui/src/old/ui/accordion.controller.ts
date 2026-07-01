/**
 * accordion.controller.ts - the single source of truth for accordion *behavior*.
 *
 * Anti-drift: written once, framework-free, against a DOM root. React, Astro, and
 * a future web component render their own markup and delegate to createAccordion(root).
 * Thin GLUE composing existing primitives, not a reimplementation:
 *   - createSelectionGroup -> which items are expanded (single / multiple / collapsible)
 *   - createRovingFocus    -> ArrowUp/Down/Home/End between headers + roving tabindex
 * The controller only adds click toggling and ARIA/visibility reflection.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - items:    [data-accordion-item][data-value]
 *   - triggers: <button data-accordion-trigger data-roving-item data-value> (inside the item)
 *   - contents: [data-accordion-content][data-value]  (role="region")
 *
 * @example
 * ```ts
 * const acc = createAccordion(rootEl, { type: 'single', collapsible: true, onChange: (vals) => save(vals) });
 * acc.setValue(['item-1']); // programmatic (no onChange)
 * acc.destroy();
 * ```
 */
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import type { CleanupFunction } from '../../primitives/types';

export interface AccordionControllerOptions {
  /** single = one open at a time; multiple = any number. */
  type?: 'single' | 'multiple';
  /** In single mode, allow closing the open item. */
  collapsible?: boolean;
  /** Initially expanded values. */
  initial?: string[];
  /** Called when expansion changes via user interaction (not programmatic setValue). */
  onChange?: (values: string[]) => void;
}

export interface AccordionController {
  /** The underlying selection state cell. */
  readonly group: SelectionGroup;
  /** Programmatically set expanded values. Does NOT fire onChange. */
  setValue(values: string[]): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

export function createAccordion(
  root: HTMLElement,
  options: AccordionControllerOptions = {},
): AccordionController {
  const { type = 'single', collapsible = false, onChange } = options;
  const group = createSelectionGroup({
    multiple: type === 'multiple',
    collapsible,
    initial: options.initial ?? [],
  });

  // Reflect expansion onto the DOM. roving-focus owns tabindex; this owns
  // aria-expanded / data-state and content visibility. Fires immediately.
  const unsubscribe = group.subscribe((selected) => {
    const isOpen = (el: HTMLElement): boolean =>
      el.dataset.value !== undefined && selected.includes(el.dataset.value);
    for (const trigger of root.querySelectorAll<HTMLElement>('[data-accordion-trigger]')) {
      const open = isOpen(trigger);
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('data-state', open ? 'open' : 'closed');
    }
    for (const content of root.querySelectorAll<HTMLElement>('[data-accordion-content]')) {
      const open = isOpen(content);
      content.hidden = !open;
      content.setAttribute('data-state', open ? 'open' : 'closed');
    }
    for (const item of root.querySelectorAll<HTMLElement>('[data-accordion-item]')) {
      item.setAttribute('data-state', isOpen(item) ? 'open' : 'closed');
    }
  });

  // Vertical arrow navigation + roving tabindex via the shared primitive.
  // Accordion uses manual activation (Enter/Space/click toggle), so navigation
  // only moves focus - it does not toggle.
  const stopRoving = createRovingFocus(root, { orientation: 'vertical' });

  const onClick = (event: MouseEvent): void => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-accordion-trigger]:not([disabled])',
    );
    if (trigger?.dataset.value) {
      group.toggle(trigger.dataset.value);
      onChange?.(group.get());
    }
  };
  root.addEventListener('click', onClick);

  return {
    group,
    setValue: (values) => {
      group.set(values);
    },
    destroy: () => {
      unsubscribe();
      stopRoving();
      root.removeEventListener('click', onClick);
    },
  };
}
