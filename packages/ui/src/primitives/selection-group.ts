/**
 * selection-group.ts - framework-agnostic active-item / expanded-set state.
 *
 * The state behind tabs, accordion, navigation-menu, menubar (and later
 * radio-group, toggle-group) is all one shape: a set of selected string values
 * with single- or multiple-select semantics. Writing that logic per framework
 * (React, Astro, Vue, a web component) would repeat it N times. This writes it
 * ONCE on createMemory; every framework wrapper stays thin:
 *
 *   - React:  useMemory(group.memory) + group.select/toggle
 *   - Astro:  a small <script> that imports this and group.subscribe(...)
 *   - WC/Vue: the same import
 *
 * This mirrors how *.classes.ts writes styling once for all framework targets -
 * the registry ships one shared file, not duplicated logic.
 *
 * Two flags cover every case:
 *   - multiple:    hold N selected values (accordion type="multiple")
 *   - collapsible: in single mode, allow toggling the active value off
 *                  (accordion single, menus); tabs leave it false (always one active)
 *
 * @example
 * ```ts
 * const tabs = createSelectionGroup({ initial: 'overview' });      // single
 * tabs.select('details');
 *
 * const acc = createSelectionGroup({ multiple: true });            // multi-expand
 * acc.toggle('item-1');
 * acc.toggle('item-2');
 * acc.get(); // ['item-1', 'item-2']
 *
 * const menu = createSelectionGroup({ collapsible: true });        // single, closable
 * menu.toggle('file'); // open
 * menu.toggle('file'); // closed
 * ```
 */
import { createMemory, type Memory } from './memory';

export interface SelectionGroupState {
  /** Selected values. Single mode holds 0 or 1; multiple holds N. */
  selected: string[];
}

export interface SelectionGroupOptions {
  /** Hold multiple selected values (e.g. accordion type="multiple"). Default false. */
  multiple?: boolean;
  /** In single mode, allow toggling the active value off. Default false. */
  collapsible?: boolean;
  /** Initial selection. */
  initial?: string | string[];
}

export interface SelectionGroup {
  /** The reactive cell - for useMemory, select, derive. */
  readonly memory: Memory<SelectionGroupState>;
  /** Current selected values. */
  get(): string[];
  /** Replace the full selection (clamped to 1 in single mode). */
  set(values: string[]): void;
  /** Select a value. Single mode replaces; multiple mode adds. */
  select(value: string): void;
  /** Toggle a value. Honors `collapsible` in single mode. */
  toggle(value: string): void;
  /** Clear all selection. */
  clear(): void;
  /** Whether a value is currently selected. */
  isSelected(value: string): boolean;
  /** Subscribe to selection changes (fires immediately with current value). */
  subscribe(listener: (selected: string[]) => void): () => void;
}

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Create a selection group: the shared engine for anything that picks from a set.
 *
 * One primitive, two modes. `multiple: false` (default) is exclusive selection --
 * tabs, radio groups, select. `multiple: true` is additive -- multi-accordion,
 * toggle groups. `collapsible: true` lets single mode deselect to empty (accordion
 * that can fully close); without it, single mode always holds exactly one value.
 *
 * State lives in one Memory cell; `subscribe` fires immediately with the current
 * value. Selection is by string value, never by index.
 */
export function createSelectionGroup(options: SelectionGroupOptions = {}): SelectionGroup {
  const { multiple = false, collapsible = false } = options;
  const memory = createMemory<SelectionGroupState>(() => ({ selected: toArray(options.initial) }));

  const isSelected = (value: string): boolean => memory.get().selected.includes(value);

  return {
    memory,
    get: () => memory.get().selected,
    isSelected,
    set: (values) => {
      memory.set({ selected: multiple ? [...values] : values.slice(0, 1) });
    },
    select: (value) => {
      if (!multiple) {
        memory.set({ selected: [value] });
        return;
      }
      if (!isSelected(value)) {
        memory.set({ selected: [...memory.get().selected, value] });
      }
    },
    toggle: (value) => {
      const current = memory.get().selected;
      if (multiple) {
        memory.set({
          selected: isSelected(value)
            ? current.filter((entry) => entry !== value)
            : [...current, value],
        });
        return;
      }
      if (isSelected(value)) {
        if (collapsible) memory.set({ selected: [] });
        return;
      }
      memory.set({ selected: [value] });
    },
    clear: () => {
      memory.set({ selected: [] });
    },
    subscribe: (listener) => memory.subscribe((state) => listener(state.selected)),
  };
}
