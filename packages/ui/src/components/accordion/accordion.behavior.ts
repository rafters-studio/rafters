import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type InstanceIds,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createRovingFocus } from '../../primitives/roving-focus';

/**
 * Accordion: a vertical stack of expandable sections. Each section is a header
 * button that discloses one region; `type` decides whether the stack holds one
 * open section or many.
 *
 * The score's only state axis is the SET of expanded values. Focus movement
 * across the header buttons is NOT state -- it is ephemeral DOM state owned by
 * the composed roving-focus primitive (the same split navigation-menu,
 * radio-group, and toggle-group make).
 *
 * On the three primitives the port issue named:
 * - `roving-focus` composes literally, on the vertical axis (ArrowUp/ArrowDown,
 *   Home/End), directly in `bindAccordion` and in the React mount effect.
 * - `selection-group` and `disclosure` do NOT compose into a score. Both own a
 *   `createMemory` cell of their own, and `createBehavior` already owns THE
 *   memory cell for this component; composing either would put one logical
 *   state in two cells with no reconciliation path, and Slice reducers are pure
 *   `(state, payload) => state` over the single cell. radio-group and
 *   toggle-group set this precedent (selection-as-reducer); the `toggle`
 *   reducer below re-expresses `createSelectionGroup.toggle`'s exact semantics
 *   -- including `collapsible` -- as a reducer over that one cell. See
 *   docs/spec/components/accordion.md.
 *
 * The reducer receives `(state, payload)` with no config (Spec 01), so the two
 * mode flags are seeded into state (`multiple`, `collapsible`) at initialState.
 *
 * Controlled/uncontrolled per the ownership-of-truth boundary applied to a set:
 * `config.value` is the consumer's controlled value (passed fresh, never
 * stored); `state.value` is the intrinsic set, seeded from `defaultValue`.
 * Projections and the change callback read the EFFECTIVE set via
 * `expandedValues(state, config)`.
 */
export type AccordionType = 'single' | 'multiple';

export interface AccordionConfig {
  /** Disclosure mode. 'single' holds at most one open section, 'multiple' any
   *  number. Default 'single'. */
  type?: AccordionType | undefined;
  /** Controlled value: shadows the intrinsic set when present. String for
   *  single, string[] for multiple. */
  value?: string | string[] | undefined;
  /** Uncontrolled seed for the intrinsic set. */
  defaultValue?: string | string[] | undefined;
  /** In single mode, allow re-activating the open section to close it, leaving
   *  the accordion fully collapsed. Ignored in multiple mode (always
   *  collapsible). Default false -- the oracle's default. */
  collapsible?: boolean | undefined;
  /** Whether the whole accordion is disabled (gates toggling; the decorators
   *  natively disable every header button, which also drops them from roving). */
  disabled?: boolean | undefined;
  /** Heading level of the `role="heading"` wrapper around each header button.
   *  Default 3 -- the oracle's `aria-level={3}`. */
  headingLevel?: number | undefined;
}

export interface AccordionState {
  /** Intrinsic expanded values -- ignored while a controlled value is present. */
  value: string[];
  /** Mode, seeded from config.type: the reducer sees no config (Spec 01). */
  multiple: boolean;
  /** Single-mode close-to-empty, seeded from config.collapsible. */
  collapsible: boolean;
}

export type AccordionActions = {
  /** Expand or collapse a section (payload: the item's value). */
  toggle: string;
};

export type AccordionPart = 'root' | 'item' | 'heading' | 'trigger' | 'content';

/** Normalize a controlled/default value to an array of values. */
function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((entry) => entry !== '');
  return value === '' ? [] : [value];
}

export function isMultiple(config: AccordionConfig): boolean {
  return (config.type ?? 'single') === 'multiple';
}

export function headingLevelOf(config: AccordionConfig): number {
  return config.headingLevel ?? 3;
}

/** The effective expanded set: a controlled value shadows intrinsic state. */
export function expandedValues(state: AccordionState, config: AccordionConfig): string[] {
  if (config.value !== undefined) {
    const values = toArray(config.value);
    return isMultiple(config) ? values : values.slice(0, 1);
  }
  return state.value;
}

/** Whether one section is effectively expanded. */
export function isItemExpanded(
  value: string,
  state: AccordionState,
  config: AccordionConfig,
): boolean {
  return expandedValues(state, config).includes(value);
}

/** Report shape for onValueChange: string for single, string[] for multiple --
 *  the oracle's `type === 'single' ? (values[0] ?? '') : values`. */
export function emitValue(values: string[], config: AccordionConfig): string | string[] {
  return isMultiple(config) ? values : (values[0] ?? '');
}

const accordionSlice: Slice<AccordionConfig, AccordionState, AccordionActions, AccordionPart> = {
  name: 'accordion',
  parts: {
    root: {},
    // One instance per section, each keyed by its data-value.
    item: { many: true },
    // The role=heading wrapper the header button lives in: the WAI-ARIA
    // accordion pattern requires the button to be contained by a heading.
    heading: { many: true, role: 'heading' },
    trigger: { many: true },
    // Panels stay in the DOM hidden when collapsed: the content must be
    // crawlable and SSR-stable, and the height transition needs the same node.
    content: { many: true, role: 'region' },
  },
  initialState: (config) => {
    const multiple = isMultiple(config);
    const seed = toArray(config.value ?? config.defaultValue);
    return {
      value: multiple ? seed : seed.slice(0, 1),
      multiple,
      // Multiple mode is inherently collapsible: every section closes
      // independently, so the flag only constrains single mode.
      collapsible: multiple || config.collapsible === true,
    };
  },
  actions: {
    // The set semantics of createSelectionGroup.toggle, as a reducer over the
    // one memory cell createBehavior owns.
    toggle: (state, value) => {
      if (!value) return state;
      if (state.multiple) {
        const has = state.value.includes(value);
        return {
          ...state,
          value: has ? state.value.filter((entry) => entry !== value) : [...state.value, value],
        };
      }
      const isOnlyOpen = state.value.length === 1 && state.value[0] === value;
      if (isOnlyOpen) {
        // Single, non-collapsible: re-activating the open section is a no-op,
        // so the accordion always keeps exactly one section open. Returning the
        // same state means the decorators' before/after comparison sees no
        // move and the consumer callback stays silent.
        return state.collapsible ? { ...state, value: [] } : state;
      }
      return { ...state, value: [value] };
    },
  },
  // The accordion-level disabled gate: a disabled accordion rejects toggling,
  // so a controlled consumer's callback never fires for an edit it would
  // refuse. Item-level disabled is expressed by natively disabling that header
  // button (which also removes it from roving), because the reducer sees only
  // the value and cannot know which items the author disabled.
  canDispatch: (_state, action, config) => (action === 'toggle' ? config.disabled !== true : true),
  aria: (state, config) => ({
    root: {
      // The accordion axis is always vertical: arrow navigation is Up/Down and
      // the sections stack. Exposed as a styling/roving hook, not as
      // aria-orientation -- the root has no ARIA role to carry it.
      'data-orientation': 'vertical',
      'data-type': isMultiple(config) ? 'multiple' : 'single',
      'data-collapsible': state.collapsible ? 'true' : 'false',
      'data-heading-level': String(headingLevelOf(config)),
      'data-disabled': config.disabled ? 'true' : undefined,
    },
  }),
  // Enter/Space on a header button map to toggle. Declared for the pure keymap
  // contract; the DOM binds rely on the native <button> converting Enter/Space
  // to a click (wiring the keymap too would double-toggle). Arrow/Home/End are
  // NOT claimed -- the composed roving-focus primitive owns focus movement.
  keymap: (event, _state, part) =>
    part === 'trigger' && (event.key === 'Enter' || event.key === ' ') ? 'toggle' : null,
};

/**
 * Per-instance ARIA for the `many` parts (Spec 01: BehaviorSpec.instanceAria).
 * `aria()` projects one AriaAttrs per part NAME; item/heading/trigger/content
 * occur once per section value, so their projections take the instance value and
 * the instance's sibling ids (a trigger reads its panel's id; the panel reads
 * its trigger's).
 *
 * `aria-controls` is projected UNCONDITIONALLY (guarded only on the id being
 * real), not on the open axis: the panel is present-but-hidden rather than
 * unmounted, so the reference is never dangling and the oracle advertised it
 * closed as well as open. That is the opposite of the `disclosable` slice's
 * `open && ids.content` guard, which exists for overlays whose content leaves
 * the DOM.
 */
export function accordionInstanceAria(
  part: AccordionPart,
  value: string,
  state: AccordionState,
  config: AccordionConfig,
  ids: InstanceIds<AccordionPart>,
): AriaAttrs {
  const expanded = isItemExpanded(value, state, config);
  const stateAttr = expanded ? 'open' : 'closed';
  if (part === 'item') {
    return { 'data-state': stateAttr };
  }
  if (part === 'heading') {
    // role + aria-level ride the projection rather than being hand-written per
    // decorator: role="heading" without aria-level is an incomplete heading.
    return { role: 'heading', 'aria-level': String(headingLevelOf(config)) };
  }
  if (part === 'trigger') {
    return {
      'aria-expanded': expanded ? 'true' : 'false',
      'aria-controls': ids.content || undefined,
      'data-state': stateAttr,
    };
  }
  if (part === 'content') {
    return {
      role: 'region',
      'aria-labelledby': ids.trigger || undefined,
      'data-state': stateAttr,
      hidden: expanded ? undefined : true,
    };
  }
  return {};
}

export const accordion: BehaviorSpec<
  AccordionConfig,
  AccordionState,
  AccordionActions,
  AccordionPart
> = { ...compose('accordion', accordionSlice), instanceAria: accordionInstanceAria };

/** Header buttons participating in toggling (excludes disabled ones, which the
 *  roving-focus primitive also skips). */
const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]:not([disabled])';

/**
 * The DOM-native binding of the accordion score -- the client the Web Component
 * and the Astro <script> both import; only React (retained-mode) reads the
 * projections declaratively instead. Composes the substrate the same way the
 * React decorator does: createBehavior is the model, createRovingFocus drives
 * ArrowUp/ArrowDown/Home/End movement and the roving tabindex across the header
 * buttons, aria-manager applies the projection, and the DOM is the part
 * registry.
 *
 * Activation is delegated click only: the header <button>s convert Enter/Space
 * to a native click, so no keydown branch is needed. Panels are
 * present-but-hidden -- `hidden` rides the instance projection, so the exit
 * transition runs on the same node.
 */
export function bindAccordion(root: HTMLElement): () => void {
  const expandedAtMount = Array.from(
    root.querySelectorAll<HTMLElement>('[data-part="trigger"][data-state="open"]'),
  )
    .map((el) => el.getAttribute('data-value'))
    .filter((value): value is string => value !== null);

  const config: AccordionConfig = {
    type: root.getAttribute('data-type') === 'multiple' ? 'multiple' : 'single',
    collapsible: root.getAttribute('data-collapsible') === 'true',
    disabled: root.getAttribute('data-disabled') === 'true',
    headingLevel: Number.parseInt(root.getAttribute('data-heading-level') ?? '', 10) || undefined,
    // WC/Astro are uncontrolled (no reactive prop), so config.value stays
    // undefined; seed the intrinsic set from the server-rendered open sections.
    defaultValue: expandedAtMount,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(accordion, config);

  // Compose the roving-focus primitive directly -- it owns the roving tabindex
  // and ArrowUp/ArrowDown/Home/End movement across the [data-roving-item]
  // header buttons. The accordion axis is vertical.
  const stopRoving = createRovingFocus(root, { orientation: 'vertical' });

  // ids are READ from the markup (server- or author-minted), never generated.
  const ids = {} as PartIds<AccordionPart>;
  for (const part of Object.keys(accordion.parts) as AccordionPart[]) {
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

  // The `many` parts, resolved from the score's own declaration -- no hardcoded
  // list, so the loop stays honest if a part is added.
  const manyParts = (Object.keys(accordion.parts) as AccordionPart[]).filter(
    (part) => accordion.parts[part].many,
  );

  const projectInstances = (state: AccordionState) => {
    for (const part of manyParts) {
      for (const el of root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
        const value = el.dataset['value'];
        if (value === undefined) continue;
        const instanceIds: InstanceIds<AccordionPart> = {};
        for (const sibling of manyParts) {
          instanceIds[sibling] =
            root.querySelector<HTMLElement>(`[data-part="${sibling}"][data-value="${value}"]`)
              ?.id ?? '';
        }
        applyProjection(el, accordionInstanceAria(part, value, state, config, instanceIds));
      }
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = accordion.aria(state, config, ids);
    for (const part of Object.keys(projection) as AccordionPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    projectInstances(state);
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    const value = trigger?.dataset['value'];
    if (value !== undefined && root.contains(trigger)) dispatch('toggle', config, value);
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    stopRoving();
    root.removeEventListener('click', onClick);
  };
}
