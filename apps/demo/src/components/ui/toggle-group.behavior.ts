import { compose, type Slice } from '@/lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import { createRovingFocus } from '@/lib/primitives/roving-focus';

/**
 * Toggle group: a set of toggle buttons coordinated as a single- or
 * multiple-select group. Ports the imperative old/ui/toggle-group.controller.ts
 * + old/ui/toggle-group.element.ts onto the behavior layer -- selection state as
 * reducer, focus movement as the composed roving-focus primitive.
 *
 * The score's only state axis is the set of selected values. Focus movement
 * across items is NOT state -- it is ephemeral DOM state owned by roving-focus
 * (mirroring radio-group/navigation-menu). Unlike radio-group, selection does
 * NOT follow focus: arrow keys move focus only; activation (Space/Enter/click,
 * fulfilled natively by the item <button>s) toggles the focused item. This is
 * the WAI-ARIA toolbar pattern, not the radio pattern.
 *
 * Two modes over one action:
 * - single (default) is collapsible -- re-activating the selected item clears it
 *   (the oracle's `current === itemValue ? '' : itemValue`).
 * - multiple is additive -- activation toggles the value in/out of the set.
 *
 * The reducer receives `(state, payload)` with no config (Spec 01), so the mode
 * is seeded into state (`multiple`) at initialState from `config.type`.
 *
 * Controlled/uncontrolled per the ownership-of-truth boundary applied to a set
 * (the same shape as radio-group applied to a string): `config.value` is the
 * consumer's controlled value (passed fresh, never stored); `state.value` is the
 * intrinsic set, seeded from `defaultValue`. Projections and the change callback
 * read the EFFECTIVE value via `selectedValues(state, config)`.
 */
export type ToggleGroupType = 'single' | 'multiple';
export type ToggleGroupVariant = 'default' | 'outline';
export type ToggleGroupSize = 'default' | 'sm' | 'lg';
export type ToggleGroupOrientation = 'horizontal' | 'vertical';

export interface ToggleGroupConfig {
  /** Selection mode. Default 'single'. */
  type?: ToggleGroupType | undefined;
  /** Controlled value: shadows the intrinsic state when present. */
  value?: string | string[] | undefined;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string | string[] | undefined;
  /** Arrow-key navigation axis. Default 'horizontal'. */
  orientation?: ToggleGroupOrientation | undefined;
  /** Whether the entire group is disabled (gates toggling, propagates to items). */
  disabled?: boolean | undefined;
  /** Advertised via the form surface (see toggle-group.md dispositions). */
  required?: boolean | undefined;
  /** Form field name (inert surface; see toggle-group.md dispositions). */
  name?: string | undefined;
  /** Visual variant. */
  variant?: ToggleGroupVariant | undefined;
  /** Size variant. */
  size?: ToggleGroupSize | undefined;
}

export interface ToggleGroupState {
  /** Intrinsic selected values -- ignored while a controlled value is present. */
  value: string[];
  /** Mode, seeded from config.type: the reducer sees no config (Spec 01). */
  multiple: boolean;
}

export type ToggleGroupActions = {
  /** Toggle a value (payload: the item's value). */
  toggle: string;
};

export type ToggleGroupPart = 'root' | 'item';

/** Normalize a controlled/default value to an array of selected strings. */
function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((entry) => entry !== '');
  return value === '' ? [] : [value];
}

function isMultiple(config: ToggleGroupConfig): boolean {
  return (config.type ?? 'single') === 'multiple';
}

export function orientationOf(config: ToggleGroupConfig): ToggleGroupOrientation {
  return config.orientation ?? 'horizontal';
}

/** The effective selected set: a controlled value shadows intrinsic state. */
export function selectedValues(state: ToggleGroupState, config: ToggleGroupConfig): string[] {
  if (config.value !== undefined) {
    const values = toArray(config.value);
    return isMultiple(config) ? values : values.slice(0, 1);
  }
  return state.value;
}

/** Report shape for onValueChange: string for single, string[] for multiple. */
export function emitValue(values: string[], config: ToggleGroupConfig): string | string[] {
  return isMultiple(config) ? values : (values[0] ?? '');
}

const toggleGroupSlice: Slice<
  ToggleGroupConfig,
  ToggleGroupState,
  ToggleGroupActions,
  ToggleGroupPart
> = {
  name: 'toggle-group',
  parts: {
    root: { role: 'group' },
    item: { many: true },
  },
  initialState: (config) => {
    const multiple = isMultiple(config);
    const seed = toArray(config.value ?? config.defaultValue);
    return { value: multiple ? seed : seed.slice(0, 1), multiple };
  },
  actions: {
    toggle: (state, value) => {
      if (!value) return state;
      if (state.multiple) {
        const has = state.value.includes(value);
        return {
          multiple: true,
          value: has ? state.value.filter((entry) => entry !== value) : [...state.value, value],
        };
      }
      // Single mode is COLLAPSIBLE: re-activating the selected item clears it.
      const isOnlySelected = state.value.length === 1 && state.value[0] === value;
      return { multiple: false, value: isOnlySelected ? [] : [value] };
    },
  },
  // The group-level disabled gate: a disabled group rejects toggling, so a
  // controlled consumer's callback never fires for an edit it would refuse.
  // Item-level disabled is handled in the bind/decorator (native disabled +
  // roving skips disabled items) rather than here, which cannot see the value.
  canDispatch: (_state, action, config) => (action === 'toggle' ? !config.disabled : true),
  // role="group" does not support aria-orientation/aria-disabled/aria-required
  // (they are not in its allowed-attribute set -- axe would flag them), so the
  // group advertises orientation via data-orientation and expresses disabled by
  // natively disabling its items. Matches the oracle WC.
  aria: (_state, config) => ({
    root: {
      'data-orientation': orientationOf(config),
      'data-disabled': config.disabled ? 'true' : undefined,
    },
  }),
  // Space/Enter on an item map to toggle. Declared for the pure keymap contract;
  // the DOM binds rely on the native <button> converting Space/Enter to a click
  // (wiring keymap too would double-toggle). Arrow keys are NOT claimed -- the
  // roving-focus primitive owns them for movement.
  keymap: (event, _state, part) =>
    part === 'item' && (event.key === 'Enter' || event.key === ' ') ? 'toggle' : null,
};

export const toggleGroup: BehaviorSpec<
  ToggleGroupConfig,
  ToggleGroupState,
  ToggleGroupActions,
  ToggleGroupPart
> = compose('toggle-group', toggleGroupSlice);

/**
 * Per-instance projection for the `item` many-part. `aria()` projects one
 * AriaAttrs per part NAME; items occur once per value, so their projection takes
 * the instance value (mirroring radio-group's radioItemAria). tabindex is
 * deliberately absent: roving-focus owns it as ephemeral DOM state, so it must
 * not appear in a projection the conformance harness asserts against.
 */
export function toggleItemAria(
  value: string,
  state: ToggleGroupState,
  config: ToggleGroupConfig,
): AriaAttrs {
  const pressed = selectedValues(state, config).includes(value);
  return {
    'aria-pressed': pressed ? 'true' : 'false',
    'data-state': pressed ? 'on' : 'off',
  };
}

/** Toggle items participating in toggling/roving (excludes disabled). */
const ITEM_SELECTOR = '[data-part="item"][data-value]:not([disabled])';

/**
 * The DOM-native binding of the toggle-group score -- the client the Web
 * Component and the Astro <script> both import; only React (retained-mode) reads
 * the projections declaratively instead. Composes the substrate the same way the
 * React controller does: createBehavior is the model, createRovingFocus drives
 * arrow/Home/End movement and the roving tabindex, aria-manager applies the
 * projection, and the DOM is the part registry.
 *
 * Activation is delegated click only: the item <button>s convert Space/Enter to
 * a native click, so no keydown branch is needed (matches bindToggle). Arrow
 * keys are handled by the composed roving-focus primitive, which finds the item
 * buttons by their `data-roving-item` marker.
 */
export function bindToggleGroup(root: HTMLElement): () => void {
  const pressedAtMount = Array.from(
    root.querySelectorAll<HTMLElement>('[data-part="item"][data-state="on"]'),
  )
    .map((el) => el.getAttribute('data-value'))
    .filter((value): value is string => value !== null);

  const config: ToggleGroupConfig = {
    type: root.getAttribute('data-type') === 'multiple' ? 'multiple' : 'single',
    orientation: root.getAttribute('data-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    disabled: root.getAttribute('data-disabled') === 'true',
    // WC/Astro are uncontrolled (no reactive prop), so config.value stays
    // undefined; seed the intrinsic set from the server-rendered pressed items.
    defaultValue: pressedAtMount,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(toggleGroup, config);

  // Compose the roving-focus primitive directly -- it owns the roving tabindex
  // and arrow/Home/End movement across the [data-roving-item] item buttons.
  const stopRoving = createRovingFocus(root, { orientation: orientationOf(config) });

  // ids are READ from the markup (server- or author-minted), never generated.
  const ids = {} as PartIds<ToggleGroupPart>;
  for (const part of Object.keys(toggleGroup.parts) as ToggleGroupPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The score's projection is already resolved (final strings, undefined =
  // absent), so apply it raw: validate:false skips aria-manager's author-input
  // coercion, which would re-read the resolved string 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = toggleGroup.aria(state, config, ids);
    for (const part of Object.keys(projection) as ToggleGroupPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const value = el.dataset['value'];
      if (value === undefined) continue;
      applyProjection(el, toggleItemAria(value, state, config));
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR);
    const value = item?.dataset['value'];
    if (value !== undefined && root.contains(item)) dispatch('toggle', config, value);
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    stopRoving();
    root.removeEventListener('click', onClick);
  };
}
