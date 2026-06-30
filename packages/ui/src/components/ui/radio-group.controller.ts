/**
 * radio-group.controller.ts - the single source of truth for radio-group *behavior*.
 *
 * Anti-drift: written once, framework-free, against a DOM root. React, Astro, and the
 * web component render their own markup and delegate to createRadioGroup(root) - so
 * behavior can never diverge between frameworks. Thin GLUE that composes existing
 * primitives, not a reimplementation:
 *   - createSelectionGroup -> single-select state, NOT collapsible (a radio cannot be
 *                             deselected by re-clicking it)
 *   - createRovingFocus    -> arrow / Home / End navigation + roving tabindex
 * The controller only adds click/Space/Enter selection and ARIA/data-state reflection.
 *
 * Markup contract (each framework renders this, controller drives it):
 *   - items:     [role="radio"][data-value]  (buttons inside the [role="radiogroup"] root)
 *   - indicator: [data-radio-indicator]      (a child of each item; shown via data-state CSS)
 *
 * @example
 * ```ts
 * const rg = createRadioGroup(rootEl, { initial: 'a', onChange: (v) => save(v) });
 * rg.setValue('b'); // programmatic (no onChange)
 * rg.destroy();
 * ```
 */
import { createRovingFocus } from '../../primitives/roving-focus';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';
import type { CleanupFunction } from '../../primitives/types';

export interface RadioGroupControllerOptions {
  /** Initially selected value. A '' value is treated as nothing selected. */
  initial?: string;
  /** Arrow-key navigation axis. Default 'vertical'. */
  orientation?: 'horizontal' | 'vertical';
  /** Called when the selection changes via user interaction (not programmatic setValue). */
  onChange?: (value: string) => void;
}

export interface RadioGroupController {
  /** The underlying selection state cell. */
  readonly group: SelectionGroup;
  /** Programmatically set the selected value. Does NOT fire onChange (for controlled sync). */
  setValue(value: string): void;
  /** Tear down listeners and subscriptions. */
  destroy: CleanupFunction;
}

export function createRadioGroup(
  root: HTMLElement,
  options: RadioGroupControllerOptions = {},
): RadioGroupController {
  const { orientation = 'vertical', onChange } = options;
  const initial =
    options.initial !== undefined && options.initial !== '' ? options.initial : undefined;
  // Single mode, NOT collapsible: re-selecting a radio keeps it selected.
  const group = createSelectionGroup(initial === undefined ? {} : { initial });

  const radios = (): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[role="radio"][data-value]'));

  // Reflect selection onto the DOM. roving-focus owns tabindex; this owns
  // aria-checked / data-state and indicator visibility. Fires immediately.
  const unsubscribe = group.subscribe((selected) => {
    for (const radio of radios()) {
      const on = radio.dataset.value !== undefined && selected.includes(radio.dataset.value);
      radio.setAttribute('aria-checked', String(on));
      radio.setAttribute('data-state', on ? 'checked' : 'unchecked');
    }
  });

  const select = (value: string): void => {
    group.select(value);
    onChange?.(value);
  };

  // Arrow / Home / End navigation + roving tabindex via the shared primitive.
  // Start focus on the checked radio so Tab enters at the active choice.
  const focusable = Array.from(
    root.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
  );
  const startIndex = Math.max(
    0,
    focusable.findIndex((radio) => radio.dataset.value === group.get()[0]),
  );
  const stopRoving = createRovingFocus(root, { orientation, loop: true, currentIndex: startIndex });

  const onClick = (event: MouseEvent): void => {
    const radio = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="radio"][data-value]:not([disabled])',
    );
    if (radio?.dataset.value !== undefined && root.contains(radio)) {
      select(radio.dataset.value);
    }
  };

  // Space / Enter select the focused radio (roving-focus owns arrow keys).
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    const radio = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="radio"][data-value]:not([disabled])',
    );
    if (radio?.dataset.value !== undefined && root.contains(radio)) {
      event.preventDefault();
      select(radio.dataset.value);
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return {
    group,
    setValue: (value) => {
      group.set(value === '' ? [] : [value]);
    },
    destroy: () => {
      unsubscribe();
      stopRoving();
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    },
  };
}
