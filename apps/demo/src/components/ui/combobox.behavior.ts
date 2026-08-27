import { compose, type Slice } from '@/lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import { computePosition } from '@/lib/primitives/collision-detector';
import { onPointerDownOutside } from '@/lib/primitives/outside-click';
import type { Align, Side } from '@/lib/primitives/types';

/**
 * Combobox: a filtering autocomplete. A single-line text input discloses a
 * listbox of options; typing filters the options, arrows move a highlight, and
 * committing an option persists its value and fills the input with its label.
 * Extracted from the imperative old/ui/combobox.tsx (+ its rejected
 * combobox.controller.ts, which was NOT read).
 *
 * This is the EDITABLE combobox APG pattern, not the listbox-focus one:
 * DOM focus never leaves the input. The active option is advertised with
 * `aria-activedescendant` on the input, and each option carries `data-highlighted`
 * for styling -- so roving-focus (which moves DOM focus and tabindex across the
 * options) does NOT fit and is deliberately not composed. Likewise typeahead
 * (type-to-jump over a focused list) does not apply here: keystrokes go to the
 * input and FILTER. Both primitives are live (select composes them), but they
 * belong to the listbox-focus variant, not this one.
 *
 * Not composed, per the issue's caveats: selection-group owns its own memory
 * cell and cannot compose, so the selected value is a plain reducer over the one
 * createBehavior cell; form-value builds a hidden mirror input for controls that
 * are NOT native form fields, and this component already has a real <input>;
 * input-events is the contenteditable/IME editor handler, not a plain-input
 * primitive. What IS composed is collision-detector (positioning) and
 * outside-click (light dismiss); Escape rides the score's keymap.
 *
 * The four state axes are `open`, `query`, `value`, and `highlighted`:
 *  - open/value follow the controlled-vs-intrinsic boundary (config shadows
 *    state; the effective reads are isOpen/selectedValue), like select & dialog.
 *  - query is the input's text. Typing sets it (and opens the list); committing
 *    an option replaces it with that option's label.
 *  - highlighted is the VALUE of the active option (undefined = none). It is a
 *    value, not an index, so `comboboxItemAria` and the aria-activedescendant
 *    projection can resolve it directly; navigation clamps against the visible
 *    (filtered) values the binding supplies in DOM order.
 */
export interface ComboboxConfig {
  /** Controlled value ('' = no selection): shadows the intrinsic state. */
  value?: string | undefined;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string | undefined;
  /** Controlled open. */
  open?: boolean | undefined;
  /** Uncontrolled seed. */
  defaultOpen?: boolean | undefined;
  /** Disable the whole control (no open, no edits). */
  disabled?: boolean | undefined;
}

export interface ComboboxState {
  open: boolean;
  /** The input's text. */
  query: string;
  /** Intrinsic selected value ('' = no selection). */
  value: string;
  /** The value of the currently active option (undefined = none). */
  highlighted: string | undefined;
}

export type ComboboxActions = {
  /** Open the listbox; clears the highlight. */
  open: undefined;
  /** Close the listbox; clears the highlight (ported reset). */
  close: undefined;
  /** Write the input text; opens the list and clears the highlight (payload: text). */
  setQuery: string;
  /** Point at an option directly, e.g. pointer hover (payload: value). */
  highlight: string;
  /** Move the highlight to the next visible option; opens the list. Payload: the
   *  visible option values in DOM order (the binding knows the filtered set). */
  highlightNext: string[];
  /** Move the highlight to the previous visible option. Payload: as highlightNext. */
  highlightPrev: string[];
  /** Commit an option: set value, fill the input with the label, close, clear
   *  the highlight (payload: the chosen value and its display label). */
  select: { value: string; label: string };
};

export type ComboboxPart = 'root' | 'input' | 'trigger' | 'content' | 'item' | 'empty';

/** The effective open: controlled config shadows intrinsic state. */
export function isOpen(state: ComboboxState, config: ComboboxConfig): boolean {
  return config.open ?? state.open;
}

/** The effective value: controlled config shadows intrinsic state. */
export function selectedValue(state: ComboboxState, config: ComboboxConfig): string {
  return config.value ?? state.value;
}

/** An option matches the query when its label OR its value contains the query,
 *  case-insensitively. An empty query matches everything (ported filter rule). */
export function matchesQuery(label: string, value: string, query: string): boolean {
  if (query === '') return true;
  const q = query.toLowerCase();
  return label.toLowerCase().includes(q) || value.toLowerCase().includes(q);
}

/** The next highlighted value when moving through `values` (DOM order) by
 *  `direction` (+1 next, -1 previous), clamped at the ends. From no highlight,
 *  +1 lands on the first and -1 lands on the first as well (ported ArrowUp
 *  clamp to 0). Undefined only when there are no visible values. */
export function nextHighlight(
  values: string[],
  current: string | undefined,
  direction: 1 | -1,
): string | undefined {
  if (values.length === 0) return undefined;
  const index = current === undefined ? -1 : values.indexOf(current);
  const target = direction === 1 ? Math.min(index + 1, values.length - 1) : Math.max(index - 1, 0);
  return values[target] ?? current;
}

const comboboxSlice: Slice<ComboboxConfig, ComboboxState, ComboboxActions, ComboboxPart> = {
  name: 'combobox',
  parts: {
    root: {},
    input: {},
    // The toggle chevron: an optional pointer affordance (tabindex -1 in the
    // view) that opens/closes without stealing focus from the input.
    trigger: { optional: true },
    // The listbox stays in light DOM, hidden when closed: the dismiss listener
    // reads it and the options are filtered in place. Presence is constant.
    content: { optional: true },
    item: { many: true },
    // The no-results message, shown by the binding when the filter empties.
    empty: { optional: true },
  },
  initialState: (config) => ({
    open: config.open ?? config.defaultOpen ?? false,
    query: '',
    value: config.value ?? config.defaultValue ?? '',
    highlighted: undefined,
  }),
  actions: {
    open: (state) => ({ ...state, open: true, highlighted: undefined }),
    close: (state) => ({ ...state, open: false, highlighted: undefined }),
    setQuery: (state, query) => ({ ...state, query, open: true, highlighted: undefined }),
    highlight: (state, value) => ({ ...state, highlighted: value }),
    highlightNext: (state, values) => ({
      ...state,
      open: true,
      highlighted: nextHighlight(values, state.highlighted, 1),
    }),
    highlightPrev: (state, values) => ({
      ...state,
      highlighted: nextHighlight(values, state.highlighted, -1),
    }),
    select: (state, { value, label }) => ({
      ...state,
      value,
      query: label,
      open: false,
      highlighted: undefined,
    }),
  },
  // Idempotence gate on the open axis so consumer callbacks fire once per real
  // transition. Every other action is always allowed (a disabled control is
  // guarded at the binding, where the native <input>/click already refuse).
  canDispatch: (state, action, config) => {
    if (action === 'open') return !isOpen(state, config);
    if (action === 'close') return isOpen(state, config);
    return true;
  },
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    const disabled = config.disabled ?? false;
    return {
      root: {
        'data-state': open ? 'open' : 'closed',
        'data-disabled': disabled ? '' : undefined,
      },
      input: {
        role: 'combobox',
        'aria-autocomplete': 'list',
        'aria-haspopup': 'listbox',
        'aria-expanded': open ? 'true' : 'false',
        // Empty-id sentinel: reference the listbox only when open and its id is
        // real, so an initially-closed input leaks no dangling ref.
        'aria-controls': open && ids.content ? ids.content : undefined,
        // The active option, advertised without moving DOM focus. Keyed off the
        // fixed option-id contract each decorator renders. Absent when closed or
        // when nothing is highlighted -- a dangling ref is an axe violation.
        'aria-activedescendant':
          open && state.highlighted !== undefined && ids.content
            ? `${ids.content}-option-${state.highlighted}`
            : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'data-state': open ? 'open' : 'closed',
      },
      // The toggle's accessible name tracks what the gesture does next. It lives
      // in the projection (not inline in a decorator) so all three performances
      // update it: the WC/Astro binds apply it on every render, React reads it.
      trigger: {
        'aria-label': open ? 'Close' : 'Open',
      },
      content: {
        role: 'listbox',
        // The listbox is named by the input that controls it.
        'aria-labelledby': ids.input || undefined,
        'data-state': open ? 'open' : 'closed',
      },
    };
  },
  // Focus stays on the input, so it is the only part that claims keys.
  keymap: (event, state, part, config) => {
    if (part !== 'input') return null;
    const open = isOpen(state, config);
    if (event.key === 'Escape') return open ? 'close' : null;
    // Tab commits nothing but closes an open list, letting focus move on.
    if (event.key === 'Tab') return open ? 'close' : null;
    // ArrowDown opens a closed list and steps the highlight down.
    if (event.key === 'ArrowDown') return 'highlightNext';
    // ArrowUp only steps while open (ported: no open-on-ArrowUp).
    if (event.key === 'ArrowUp') return open ? 'highlightPrev' : null;
    // Enter commits the highlighted option, if any.
    if (event.key === 'Enter') return open && state.highlighted !== undefined ? 'select' : null;
    return null;
  },
};

export const combobox: BehaviorSpec<ComboboxConfig, ComboboxState, ComboboxActions, ComboboxPart> =
  compose('combobox', comboboxSlice);

/**
 * Per-instance projection for the many-instance `item` part. Spec 01's aria()
 * projects one AriaAttrs per part NAME; options occur once per value, so their
 * projection takes the instance value (mirrors selectItemAria). role, id,
 * data-value and aria-disabled are static markup.
 */
export function comboboxItemAria(
  itemValue: string,
  state: ComboboxState,
  config: ComboboxConfig,
): AriaAttrs {
  const selected = selectedValue(state, config) === itemValue;
  const highlighted = state.highlighted === itemValue;
  return {
    'aria-selected': selected ? 'true' : 'false',
    'data-state': selected ? 'checked' : 'unchecked',
    'data-highlighted': highlighted ? '' : undefined,
  };
}

export const DEFAULT_SIDE: Side = 'bottom';
export const DEFAULT_ALIGN: Align = 'start';
export const DEFAULT_SIDE_OFFSET = 4;
export const DEFAULT_ALIGN_OFFSET = 0;

/** The anchor/align intent for positioning. Decorator/view config, NOT score
 *  config: the resolved side is post-collision ephemeral DOM state. */
export interface ComboboxPositionOptions {
  side?: Side | undefined;
  align?: Align | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
}

/**
 * Position the listbox against the input -- a framework-affordance shared by
 * every decorator. Composes the collision-detector primitive and applies the
 * result with fixed positioning, matching the listbox width to the input
 * (ported minWidth). Must run AFTER the content is un-hidden so measurement
 * sees layout, exactly as bindPopover orders it.
 */
export function positionCombobox(
  input: HTMLElement | null,
  content: HTMLElement | null,
  options: ComboboxPositionOptions = {},
): void {
  if (!input || !content) return;
  const result = computePosition(input, content, {
    side: options.side ?? DEFAULT_SIDE,
    align: options.align ?? DEFAULT_ALIGN,
    sideOffset: options.sideOffset ?? DEFAULT_SIDE_OFFSET,
    alignOffset: options.alignOffset ?? DEFAULT_ALIGN_OFFSET,
    avoidCollisions: true,
  });
  content.style.position = 'fixed';
  content.style.left = '0';
  content.style.top = '0';
  content.style.transform = `translate(${Math.round(result.x)}px, ${Math.round(result.y)}px)`;
  content.style.minWidth = `${input.offsetWidth}px`;
  content.setAttribute('data-side', result.side);
  content.setAttribute('data-align', result.align);
}

/** A visible, enabled option element -- the set the filter leaves showing and
 *  navigation/commit operate over (shared so all readers agree). */
function isVisibleOption(item: HTMLElement): boolean {
  return (
    !item.hidden &&
    !item.hasAttribute('data-disabled') &&
    item.getAttribute('aria-disabled') !== 'true'
  );
}

/** The values of the currently visible (filtered, enabled) options, in DOM
 *  order -- the array the navigation actions clamp against. */
export function visibleOptionValues(content: HTMLElement | null): string[] {
  if (!content) return [];
  const values: string[] = [];
  for (const item of content.querySelectorAll<HTMLElement>('[data-part="item"]')) {
    if (!isVisibleOption(item)) continue;
    const value = item.dataset['value'];
    if (value !== undefined) values.push(value);
  }
  return values;
}

/**
 * The DOM-native binding of the combobox score -- the client the Web Component
 * and the Astro <script> both import. Only React reads the projections
 * declaratively. Beyond the pure score it carries the combobox concerns:
 * PRESENCE (the listbox hides off the open axis, staying in light DOM), FILTER
 * (options and the empty message toggle on the query), value-text sync (the
 * input mirrors the query), and the two composed primitives -- collision
 * positioning and outside-pointerdown dismissal -- started on the open edge and
 * torn down on close, sparing the input and the toggle so a gesture does not
 * dismiss then re-open.
 */
export function bindCombobox(root: HTMLElement): () => void {
  const inputEl = root.querySelector<HTMLInputElement>('[data-part="input"]');
  const contentEl = root.querySelector<HTMLElement>('[data-part="content"]');
  const config: ComboboxConfig = {
    disabled:
      root.hasAttribute('disabled') ||
      root.dataset['disabled'] === '' ||
      (inputEl?.disabled ?? false),
    defaultValue: root.getAttribute('value') ?? undefined,
    defaultOpen: contentEl?.dataset['state'] === 'open',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(combobox, config);

  const positionOptions: ComboboxPositionOptions = {
    side: (root.getAttribute('side') as Side | null) ?? undefined,
    align: (root.getAttribute('align') as Align | null) ?? undefined,
  };

  // The open-listbox affordances (positioning + light dismiss) are
  // level-triggered: present only while open.
  let openCleanup: (() => void) | null = null;

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<ComboboxPart>;
  for (const part of Object.keys(combobox.parts) as ComboboxPart[])
    ids[part] = getPart(part)?.id ?? '';

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const startOpenAffordances = () => {
    const content = getPart('content');
    if (!content) return;
    const reposition = () => positionCombobox(getPart('input'), content, positionOptions);
    reposition();
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    const stopDismiss = onPointerDownOutside(content, (event) => {
      const target = event.target as Node;
      // Spare the input and the toggle so a toggle gesture does not dismiss
      // then re-open (ported: the old code spared the input wrapper).
      if (getPart('input')?.contains(target)) return;
      if (getPart('trigger')?.contains(target)) return;
      dispatch('close', config);
    });
    openCleanup = () => {
      window.removeEventListener('scroll', reposition, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', reposition);
      stopDismiss();
    };
  };

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);

    const projection = combobox.aria(state, config, ids);
    for (const part of Object.keys(projection) as ComboboxPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }

    // Filter the options in place and toggle the empty message. Hidden options
    // stay in the DOM so their ids remain stable for aria-activedescendant.
    let visibleCount = 0;
    for (const item of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const value = item.dataset['value'] ?? '';
      const label = (item.textContent ?? '').trim();
      const shown = matchesQuery(label, value, state.query);
      item.hidden = !shown;
      if (shown) visibleCount += 1;
    }
    const emptyEl = getPart('empty');
    if (emptyEl) emptyEl.hidden = visibleCount > 0;

    // Per-instance option projection (aria-selected / highlight / checked).
    for (const el of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const itemValue = el.dataset['value'];
      if (itemValue === undefined) continue;
      applyProjection(el, comboboxItemAria(itemValue, state, config));
    }

    // Presence: the listbox hides off the open axis (stays in light DOM).
    if (contentEl) contentEl.hidden = !open;

    // Value-text sync: the input mirrors the query. Write only on divergence so
    // the caret is preserved while typing.
    if (inputEl && inputEl.value !== state.query) inputEl.value = state.query;

    // Composed affordances, level-triggered: start on the open edge (after the
    // listbox is un-hidden so positioning can measure), tear down on close.
    if (open && !openCleanup) {
      startOpenAffordances();
    } else if (!open && openCleanup) {
      openCleanup();
      openCleanup = null;
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const isDisabledItem = (item: HTMLElement): boolean =>
    item.hasAttribute('data-disabled') || item.getAttribute('aria-disabled') === 'true';

  const onInput = (event: Event) => {
    if (event.target !== inputEl || !inputEl) return;
    if (config.disabled) return;
    dispatch('setQuery', config, inputEl.value);
  };
  root.addEventListener('input', onInput);

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-part="item"]');
    if (item && root.contains(item)) {
      if (isDisabledItem(item)) return;
      const value = item.dataset['value'];
      if (value !== undefined) {
        dispatch('select', config, { value, label: (item.textContent ?? '').trim() });
        getPart('input')?.focus();
      }
      return;
    }
    const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
    if (trigger && root.contains(trigger)) {
      if (config.disabled) return;
      dispatch(isOpen(memory.get(), config) ? 'close' : 'open', config);
      getPart('input')?.focus();
    }
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as ComboboxPart | undefined;
    if (!part) return;
    const action = combobox.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      part,
      config,
    );
    if (!action) return;
    if (action === 'highlightNext' || action === 'highlightPrev') {
      if (config.disabled) return;
      event.preventDefault();
      dispatch(action, config, visibleOptionValues(getPart('content')));
      return;
    }
    if (action === 'select') {
      const value = memory.get().highlighted;
      if (value === undefined) return;
      const item = getPart('content')?.querySelector<HTMLElement>(
        `[data-part="item"][data-value="${value}"]`,
      );
      if (!item || isDisabledItem(item)) return;
      event.preventDefault();
      dispatch('select', config, { value, label: (item.textContent ?? '').trim() });
      return;
    }
    if (action === 'close') {
      // Escape keeps focus on the input; Tab is allowed to move focus on.
      if (event.key === 'Escape') event.preventDefault();
      dispatch('close', config);
    }
  };
  root.addEventListener('keydown', onKeydown);

  // Pointer over an option points the highlight at it (ported handleMouseEnter),
  // matching the pointer-follows-highlight of the listbox pattern.
  const onPointerMove = (event: Event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-part="item"]');
    if (item && root.contains(item) && !isDisabledItem(item)) {
      const value = item.dataset['value'];
      if (value !== undefined) dispatch('highlight', config, value);
    }
  };
  root.addEventListener('pointermove', onPointerMove);

  return () => {
    unsubscribe();
    openCleanup?.();
    openCleanup = null;
    root.removeEventListener('input', onInput);
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('pointermove', onPointerMove);
  };
}
