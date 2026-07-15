/**
 * select.controller.ts - the single source of truth for select *behavior*.
 *
 * Anti-drift mechanism: select state is written ONCE here, framework-free. React
 * (and the pending web component, #1337) render their own markup and delegate runtime
 * state to createSelect() - so behavior can never diverge between frameworks.
 *
 * Thin GLUE that composes existing primitives, not a reimplementation:
 *   - createSelectionGroup -> the selected VALUE (single-select: select replaces)
 *   - createMemory cell    -> open + keyboard highlight + a label version counter
 *
 * The bottom-up label registry (each item registers its display text on mount, the
 * trigger's value reads it back) lives in a plain Map behind a `labelVersion` counter
 * on the cell. Putting the Map itself in the cell would re-render EVERY cell consumer
 * on every child mount; bumping a counter lets the value display re-render via
 * `select(s => s.labelVersion, ...)` without churning open/highlight consumers.
 *
 * Roving focus and typeahead already compose as their own primitives; the framework
 * wrapper wires their callbacks to setHighlighted. Floating position, refs, and ids
 * stay local to the wrapper - they are not state.
 *
 * @example
 * ```ts
 * const select = createSelect({ initialValue: 'apple', onValueChange: save });
 * select.setOpen(true);
 * select.selectValue('banana'); // fires onValueChange, closes, value replaced
 * select.destroy();
 * ```
 */
import { createMemory, type Memory } from '../../primitives/memory';
import { createSelectionGroup, type SelectionGroup } from '../../primitives/selection-group';

export interface SelectCellState {
  open: boolean;
  highlightedValue: string | undefined;
  /** Bumped on each registerLabel; labels themselves live in a ref, not the cell. */
  labelVersion: number;
}

export interface SelectControllerOptions {
  initialValue?: string;
  initialOpen?: boolean;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export interface SelectController {
  /** Single-select value state. */
  readonly group: SelectionGroup;
  /** Open + highlight + label-version cell. */
  readonly cell: Memory<SelectCellState>;
  /** Programmatic value set (controlled-sync path). Does NOT fire onValueChange. */
  setValue(value: string): void;
  /** User selection: replaces value, fires onValueChange, then closes. */
  selectValue(value: string): void;
  /** Set open. Closing also clears the keyboard highlight. Fires onOpenChange. */
  setOpen(open: boolean): void;
  /** Set the keyboard-highlighted value. */
  setHighlighted(value: string | undefined): void;
  /** Register an item's display label. Bumps labelVersion only when it changes. */
  registerLabel(value: string, label: string): void;
  /** Read a registered display label. */
  getLabel(value: string): string | undefined;
  /** Tear down (no-op today; present for API symmetry with DOM-bound controllers). */
  destroy(): void;
}

export function createSelect(options: SelectControllerOptions = {}): SelectController {
  const { onValueChange, onOpenChange } = options;

  // Single-select: select() replaces the current value.
  const group = createSelectionGroup(
    options.initialValue === undefined ? {} : { initial: options.initialValue },
  );

  const cell = createMemory<SelectCellState>(() => ({
    open: options.initialOpen ?? false,
    highlightedValue: undefined,
    labelVersion: 0,
  }));

  // Bottom-up label registry. A plain Map behind labelVersion - see file header.
  const labels = new Map<string, string>();

  const setOpen = (open: boolean): void => {
    // Porting handleOpenChange's reset: closing clears the keyboard highlight.
    cell.patch(open ? { open: true } : { open: false, highlightedValue: undefined });
    onOpenChange?.(open);
  };

  return {
    group,
    cell,
    setValue: (value) => {
      group.select(value);
    },
    selectValue: (value) => {
      group.select(value);
      onValueChange?.(value);
      setOpen(false);
    },
    setOpen,
    setHighlighted: (value) => {
      cell.patch({ highlightedValue: value });
    },
    registerLabel: (value, label) => {
      if (labels.get(value) === label) return;
      labels.set(value, label);
      cell.patch({ labelVersion: cell.get().labelVersion + 1 });
    },
    getLabel: (value) => labels.get(value),
    destroy: () => {},
  };
}
