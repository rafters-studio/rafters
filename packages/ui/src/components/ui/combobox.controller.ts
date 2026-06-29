/**
 * combobox.controller.ts - the single source of truth for combobox *behavior*.
 *
 * Anti-drift: combobox state is written ONCE here, framework-free, so React, a
 * future Astro target, and the pending Web Component (#1368) share one state
 * implementation and behavior cannot diverge between frameworks. This is thin
 * GLUE composing existing primitives, not a reimplementation:
 *   - createSelectionGroup -> the selected VALUE (single-select)
 *   - createMemory         -> open / inputValue / activeIndex / optionsVersion
 *
 * Unlike tabs/accordion (which reflect onto a DOM root), the combobox controller
 * is pure state: the framework layer reads the cell + group via its own bridge
 * (React useMemory) and renders. The portal/positioning stays in the view.
 *
 * Option registry: the bottom-up list of registered options lives in a closure
 * ref (a plain array), NOT in the cell. A `array-in-cell` model broad-re-renders
 * every consumer on each register/unregister; instead the cell holds only an
 * `optionsVersion` counter that is bumped on register/unregister, so consumers
 * that read the registry can re-derive without churning value/open watchers.
 *
 * `inputValue` dual role: while the user types it is the LIVE search query that
 * drives `filteredOptions()`; after a commit (`selectOption`) it is overwritten
 * with the chosen option's LABEL. The two roles share one field by design - the
 * committed label is itself a valid (exact) query against the option set.
 *
 * @example
 * ```ts
 * const combobox = createCombobox({ onValueChange: save });
 * combobox.setInputValue('uni');                              // opens, filters
 * combobox.setActiveIndex(0);
 * combobox.selectOption(combobox.filteredOptions()[0].value); // commit + label + close
 * combobox.destroy();
 * ```
 */
import { createMemory, type Memory } from '../../primitives/memory';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Disabled options render but cannot be committed (preserves prior behavior). */
  disabled?: boolean;
}

export interface ComboboxCellState {
  /** Whether the listbox panel is open. */
  open: boolean;
  /** Live search query while typing; the committed option label after selection. */
  inputValue: string;
  /** Index into `filteredOptions()` (-1 = none highlighted). */
  activeIndex: number;
  /** Bumped on every register/unregister; the options array lives in a ref. */
  optionsVersion: number;
}

export interface ComboboxControllerOptions {
  /** Initially selected value. Falsy means no selection. */
  initialValue?: string;
  /** Initially open. Default false. */
  initialOpen?: boolean;
  /** Called when a value is committed via user interaction (selectOption), not setValue. */
  onValueChange?: (value: string) => void;
  /** Called when the open state changes via user interaction (setOpen / selectOption close). */
  onOpenChange?: (open: boolean) => void;
}

export interface ComboboxController {
  /** Selected value (single-select). */
  readonly group: SelectionGroup;
  /** Reactive cell for open / inputValue / activeIndex / optionsVersion. */
  readonly cell: Memory<ComboboxCellState>;
  /** Programmatically set the value. Does NOT fire onValueChange (for controlled sync). */
  setValue(value: string): void;
  /** Set open state. Resets activeIndex on open. Fires onOpenChange. */
  setOpen(open: boolean): void;
  /** Set the search text. Opens the panel if closed and resets activeIndex to -1. */
  setInputValue(text: string): void;
  /** Highlight an option by its index into `filteredOptions()`. */
  setActiveIndex(index: number): void;
  /** Register (or replace) an option in the ref-backed registry; bumps optionsVersion. */
  registerOption(option: ComboboxOption): void;
  /** Remove an option from the registry; bumps optionsVersion. */
  unregisterOption(value: string): void;
  /** Options filtered by the current inputValue (filtering lives in the controller). */
  filteredOptions(): ComboboxOption[];
  /** User commit: set value + set inputValue to the label + close (and fire callbacks). */
  selectOption(value: string): void;
  /** Tear down subscriptions. */
  destroy(): void;
}

export function createCombobox(options: ComboboxControllerOptions = {}): ComboboxController {
  const { onValueChange, onOpenChange } = options;

  const group = createSelectionGroup(options.initialValue ? { initial: options.initialValue } : {});

  const cell = createMemory<ComboboxCellState>(() => ({
    open: options.initialOpen ?? false,
    inputValue: '',
    activeIndex: -1,
    optionsVersion: 0,
  }));

  // Bottom-up option registry. Lives in a ref so register/unregister scope their
  // re-render to consumers via optionsVersion instead of churning every watcher.
  let registry: ComboboxOption[] = [];

  const bumpVersion = (): void => {
    cell.patch({ optionsVersion: cell.get().optionsVersion + 1 });
  };

  const filteredOptions = (): ComboboxOption[] => {
    const { inputValue } = cell.get();
    if (!inputValue) return registry;
    const lower = inputValue.toLowerCase();
    return registry.filter(
      (option) =>
        option.label.toLowerCase().includes(lower) || option.value.toLowerCase().includes(lower),
    );
  };

  return {
    group,
    cell,
    setValue: (value) => {
      group.select(value);
    },
    setOpen: (open) => {
      cell.patch(open ? { open, activeIndex: -1 } : { open });
      onOpenChange?.(open);
    },
    setInputValue: (text) => {
      const shouldOpen = Boolean(text) && !cell.get().open;
      cell.patch(
        shouldOpen
          ? { inputValue: text, activeIndex: -1, open: true }
          : { inputValue: text, activeIndex: -1 },
      );
      if (shouldOpen) onOpenChange?.(true);
    },
    setActiveIndex: (index) => {
      cell.patch({ activeIndex: index });
    },
    registerOption: (option) => {
      registry = registry.some((entry) => entry.value === option.value)
        ? registry.map((entry) => (entry.value === option.value ? option : entry))
        : [...registry, option];
      bumpVersion();
    },
    unregisterOption: (value) => {
      registry = registry.filter((entry) => entry.value !== value);
      bumpVersion();
    },
    filteredOptions,
    selectOption: (value) => {
      const option = registry.find((entry) => entry.value === value);
      if (!option || option.disabled) return;
      group.select(value);
      onValueChange?.(value);
      cell.patch({ inputValue: option.label, open: false });
      onOpenChange?.(false);
      // Focus stays IMPERATIVE at the framework boundary (e.g. inputRef.focus()).
    },
    destroy: () => {
      // No internal subscriptions to tear down; callbacks fire inline from actions.
    },
  };
}
