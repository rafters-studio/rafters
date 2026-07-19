import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createRovingFocus } from '../../primitives/roving-focus';

/**
 * Radio group: an exclusive set of options where exactly one (or none) is
 * selected. Replaces the imperative old/ui/radio-group.controller.ts +
 * radio-group.element.ts wholesale.
 *
 * The score's only state axis is the selected value. Focus movement across
 * items is NOT state -- it is ephemeral DOM state owned by the roving-focus
 * primitive (mirroring navigation-menu). Selection follows focus per the WAI-ARIA
 * radio pattern: an arrow key moves focus AND selects the newly focused item;
 * Space/Enter select the focused item; Tab enters the group without selecting.
 *
 * Controlled/uncontrolled per the ownership-of-truth boundary applied to a
 * string, the same shape as input/navigation-menu: config.value is the
 * consumer's controlled value (passed fresh, never stored); state.value is the
 * intrinsic value seeded from defaultValue. Projections and the change callback
 * read the EFFECTIVE value via selectedValue().
 */
export interface RadioGroupConfig {
  /** Controlled value: shadows the intrinsic state when present. '' = none. */
  value?: string | undefined;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string | undefined;
  /** Arrow-key navigation axis. Default 'vertical'. */
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** Whether the entire group is disabled (gates selection, propagates to items). */
  disabled?: boolean | undefined;
  /** Advertised to AT via aria-required on the group. */
  required?: boolean | undefined;
  /** Form field name (inert surface; see radio-group.md dispositions). */
  name?: string | undefined;
}

export interface RadioGroupState {
  /** Intrinsic selected value -- ignored while a controlled value is present. */
  value: string | null;
}

export type RadioGroupActions = {
  /** Select a value (payload: the item's value). Radios never deselect. */
  select: string;
};

export type RadioGroupPart = 'root' | 'item';

/** The effective selected value: a controlled value shadows intrinsic state. */
export function selectedValue(state: RadioGroupState, config: RadioGroupConfig): string | null {
  if (config.value !== undefined) return config.value === '' ? null : config.value;
  return state.value;
}

function orientationOf(config: RadioGroupConfig): 'horizontal' | 'vertical' {
  return config.orientation ?? 'vertical';
}

const radio: Slice<RadioGroupConfig, RadioGroupState, RadioGroupActions, RadioGroupPart> = {
  name: 'radio',
  parts: {
    root: { role: 'radiogroup' },
    item: { role: 'radio', many: true },
  },
  initialState: (config) => {
    const seed = config.value ?? config.defaultValue ?? '';
    return { value: seed === '' ? null : seed };
  },
  actions: {
    // Single mode, NOT collapsible: re-selecting a radio keeps it selected.
    // Returning the SAME state ref when unchanged means memory does not notify
    // and a controlled consumer's callback does not re-fire (old parity:
    // "does not re-fire change when the same item is clicked twice").
    select: (state, value) => (state.value === value ? state : { value }),
  },
  // The group-level disabled gate: a disabled group rejects selection, so a
  // controlled consumer's callback never fires for an edit it would refuse.
  // Item-level disabled is handled in the bind (and roving skips disabled items).
  canDispatch: (_state, action, config) => (action === 'select' ? !config.disabled : true),
  aria: (_state, config) => ({
    root: {
      'aria-orientation': orientationOf(config),
      'aria-required': config.required ? 'true' : undefined,
      'aria-disabled': config.disabled ? 'true' : undefined,
    },
  }),
  // Space/Enter select the focused item. Arrow keys are owned by the
  // roving-focus primitive for movement; the bind adds select-follows-focus.
  keymap: (event, _state, part) =>
    part === 'item' && (event.key === 'Enter' || event.key === ' ') ? 'select' : null,
};

export const radioGroup: BehaviorSpec<
  RadioGroupConfig,
  RadioGroupState,
  RadioGroupActions,
  RadioGroupPart
> = compose('radio-group', radio);

/**
 * Per-instance projection for the `item` many-part. Spec 01's aria() projects
 * one AriaAttrs per part NAME; items occur once per option value, so their
 * projection takes the instance value (mirroring navigation-menu's
 * navTriggerAria). tabindex is deliberately absent: roving-focus owns it as
 * ephemeral DOM state, so it must not appear in a projection the conformance
 * harness asserts against.
 */
export function radioItemAria(
  value: string,
  state: RadioGroupState,
  config: RadioGroupConfig,
): AriaAttrs {
  const checked = selectedValue(state, config) === value;
  return {
    'aria-checked': checked ? 'true' : 'false',
    'data-state': checked ? 'checked' : 'unchecked',
  };
}

/** Radio items participating in selection/roving (excludes disabled). */
const RADIO_SELECTOR = '[data-part="item"][data-value]:not([disabled])';
const MOVEMENT_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/**
 * The DOM-native binding of the radio-group score -- the client. The Web
 * Component and the Astro <script> both import THIS; only React (retained-mode)
 * reads the projections above declaratively instead. Composes the substrate the
 * same way the React controller does: createBehavior is the model,
 * createRovingFocus drives arrow/Home/End movement and the roving tabindex,
 * aria-manager applies the projection, and the DOM is the part registry.
 *
 * Select-follows-focus: createRovingFocus registers its keydown listener during
 * bind (before this bind attaches its own keydown listener). So on an arrow key
 * roving moves focus first, and by the time the bind's handler runs
 * document.activeElement is already the newly focused radio -- which it then
 * selects. Tab-in never routes through keydown, so it focuses without selecting.
 */
export function bindRadioGroup(root: HTMLElement): () => void {
  const checkedAtMount = root
    .querySelector<HTMLElement>('[data-part="item"][data-state="checked"]')
    ?.getAttribute('data-value');
  const config: RadioGroupConfig = {
    orientation: root.getAttribute('aria-orientation') === 'horizontal' ? 'horizontal' : 'vertical',
    disabled: root.getAttribute('aria-disabled') === 'true',
    required: root.getAttribute('aria-required') === 'true',
    name: root.getAttribute('data-name') ?? undefined,
    // Seed the intrinsic value from the server-rendered checked item. WC/Astro
    // are uncontrolled (no reactive prop), so config.value stays undefined.
    defaultValue: checkedAtMount ?? '',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(radioGroup, config);

  // Compose the roving-focus primitive directly -- it owns the roving tabindex
  // and arrow/Home/End movement across the [role="radio"] items. Registered
  // here, before the bind's own keydown listener below, so on an arrow key
  // roving moves focus first and the bind then selects whatever now has focus.
  const stopRoving = createRovingFocus(root, { orientation: orientationOf(config) });

  const request = (action: keyof RadioGroupActions, payload: string): boolean =>
    dispatch(action, config, payload);

  // ids are READ from the markup (server- or author-minted), never generated.
  const ids = {} as PartIds<RadioGroupPart>;
  for (const part of Object.keys(radioGroup.parts) as RadioGroupPart[]) {
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
    const projection = radioGroup.aria(state, config, ids);
    for (const part of Object.keys(projection) as RadioGroupPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const value = el.dataset['value'];
      if (value === undefined) continue;
      applyProjection(el, radioItemAria(value, state, config));
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(RADIO_SELECTOR);
    const value = item?.dataset['value'];
    if (value !== undefined && root.contains(item)) request('select', value);
  };
  root.addEventListener('click', onClick);

  const onKeyDown = (event: KeyboardEvent) => {
    const { key } = event;
    if (key === ' ' || key === 'Enter') {
      const item = (event.target as HTMLElement).closest<HTMLElement>(RADIO_SELECTOR);
      const value = item?.dataset['value'];
      if (value === undefined || !root.contains(item)) return;
      event.preventDefault(); // Space would scroll; Enter would submit a form.
      request('select', value);
      return;
    }
    if (!MOVEMENT_KEYS.has(key)) return;
    // roving-focus (registered first) has already moved focus. Select the item
    // that now owns focus -- selection follows focus (WAI-ARIA radio pattern).
    const active = (root.getRootNode() as Document | ShadowRoot)
      .activeElement as HTMLElement | null;
    const item = active?.closest<HTMLElement>(RADIO_SELECTOR) ?? null;
    const value = item?.dataset['value'];
    if (value === undefined || !root.contains(item)) return;
    request('select', value);
  };
  root.addEventListener('keydown', onKeyDown);

  return () => {
    unsubscribe();
    stopRoving();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}
