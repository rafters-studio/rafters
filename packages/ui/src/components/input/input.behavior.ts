/**
 * @components input-group
 * @primitives aria-manager
 * @lib compose contract
 */
import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { addonPart } from '../input-group/input-group.behavior';
import { inputClassSet } from './input.classes';

/**
 * Input: a single-line text field. The archetype answer for a control whose
 * primary state is a VALUE, not an open/pressed flag.
 *
 * The value is controlled/uncontrolled per the same ownership-of-truth
 * boundary as disclosable/nav-menu, applied to a string: config.value is the
 * consumer's controlled value (passed fresh, never stored); state.value is the
 * intrinsic value seeded from defaultValue. Projections and the change
 * callback read the EFFECTIVE value via effectiveValue().
 *
 * The native <input> owns caret, IME composition, and selection -- the score
 * does NOT re-implement text editing. It only reflects the value, gates
 * setValue on disabled/readonly, and projects validity aria. That makes this
 * the simplest bind in the family: value-sync + aria, no effects, no keymap.
 */
export interface InputConfig {
  /** Controlled value: shadows the intrinsic state when present. */
  value?: string | undefined;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string | undefined;
  /** No edits while disabled (native attribute owns interaction; the gate
   *  also covers the programmatic setValue path). */
  disabled?: boolean | undefined;
  /** No edits while read-only (same dual: native attribute + gate). */
  readonly?: boolean | undefined;
  /** Advertised to AT via aria-required. */
  required?: boolean | undefined;
  /** Advertised to AT via aria-invalid; wires aria-describedby to the error. */
  invalid?: boolean | undefined;
  /** A decorative start icon is given: the field sits in a row beside it. */
  startIcon?: boolean | undefined;
  /** A decorative end icon is given: the field sits in a row beside it. */
  endIcon?: boolean | undefined;
}

export interface InputState {
  /** Intrinsic value -- ignored while a controlled value is present. */
  value: string;
}

export type InputActions = {
  /** Write a new value (payload: the next string). */
  setValue: string;
};

export type InputIconPart = 'startIcon' | 'endIcon';
export type InputPart = 'input' | 'error' | InputIconPart;

/** The effective value: a controlled value shadows the intrinsic state. */
export function effectiveValue(state: InputState, config: InputConfig): string {
  return config.value ?? state.value;
}

/** Edits are refused while disabled or read-only. */
function isEditable(config: InputConfig): boolean {
  return !config.disabled && !config.readonly;
}

const input: Slice<InputConfig, InputState, InputActions, InputPart> = {
  name: 'input',
  parts: {
    input: {},
    // The error message is a sibling the consumer renders (Field/FormMessage),
    // referenced by aria-describedby via its id -- like dialog's title and
    // description, this part carries no aria of its own, only an id target.
    error: { optional: true },
    // The decorative icon wrappers. Each is present only when the author gives
    // an icon, and each projects aria-hidden="true" so the label alone is the
    // accessible name on every target, with or without JavaScript. The wrapper
    // carries the hiding because a child the author writes cannot be
    // guaranteed to. They render inside InputGroup's addonStart / addonEnd.
    startIcon: { optional: true },
    endIcon: { optional: true },
  },
  initialState: (config) => ({ value: config.value ?? config.defaultValue ?? '' }),
  actions: {
    setValue: (state, value) => ({ ...state, value }),
  },
  // The gate is the whole reason canDispatch exists here: a disabled or
  // read-only field rejects setValue, so a controlled consumer's callback
  // never fires for an edit the field would not have accepted.
  canDispatch: (_state, action, config) => (action === 'setValue' ? isEditable(config) : true),
  aria: (_state, config, ids) => {
    const invalid = config.invalid === true;
    return {
      input: {
        // Always present as 'true'/'false': the field reflects validity even
        // when valid (a deliberate divergence from shadcn's omit-by-default).
        // The 'false' string is why the DOM bind must apply with
        // {validate:false} -- aria-manager would otherwise coerce it truthy.
        'aria-invalid': invalid ? 'true' : 'false',
        'aria-required': config.required ? 'true' : undefined,
        // Empty-id convention: reference the error only when it is both
        // relevant (invalid) and real (a rendered id). A dangling
        // aria-describedby is an axe violation; absence is honest.
        'aria-describedby': invalid && ids.error ? ids.error : undefined,
        'data-state': invalid ? 'invalid' : 'default',
      },
      startIcon: { 'aria-hidden': 'true' },
      endIcon: { 'aria-hidden': 'true' },
    };
  },
  // The native <input> owns every key: no keymap action to claim.
  keymap: () => null,
};

export const inputBehavior: BehaviorSpec<InputConfig, InputState, InputActions, InputPart> =
  compose('input', input);

/**
 * The DOM-native binding of the input score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React (retained-mode) reads
 * the projections declaratively instead.
 *
 * The simplest bind in the family: because the score has no effects and no
 * keymap, there is no effect runner and no keydown listener. The bind does
 * exactly two things on every state change -- project validity aria onto the
 * input part, and sync the input's .value property to the effective value --
 * plus one listener that turns the native 'input' event into a setValue
 * dispatch. The native <input> keeps ownership of caret, IME, and selection.
 */
export function bindInput(root: HTMLElement): () => void {
  const inputEl = root.querySelector<HTMLInputElement>('[data-part="input"]');
  if (!inputEl) return () => {};

  const config: InputConfig = {
    disabled: inputEl.disabled,
    readonly: inputEl.readOnly,
    required: inputEl.required || inputEl.getAttribute('aria-required') === 'true',
    invalid: inputEl.getAttribute('aria-invalid') === 'true' || root.hasAttribute('invalid'),
    // Seed the intrinsic value from the server-rendered markup. WC/Astro are
    // uncontrolled (no reactive prop), so config.value stays undefined.
    defaultValue: inputEl.value,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'input' ? inputEl : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(inputBehavior, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<InputPart>;
  for (const part of Object.keys(inputBehavior.parts) as InputPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion,
  // which would re-read the string 'false' (aria-invalid) as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = inputBehavior.aria(state, config, ids);
    for (const part of Object.keys(projection) as InputPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Value-sync: write only when the DOM and the effective value diverge, so
    // the caret is preserved in the common typing case (after a setValue the
    // element already holds the value). A controlled field whose consumer
    // pins config.value would revert a rejected edit here.
    const eff = effectiveValue(state, config);
    if (inputEl.value !== eff) inputEl.value = eff;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onInput = (event: Event) => {
    if (event.target !== inputEl) return;
    dispatch('setValue', config, inputEl.value);
  };
  root.addEventListener('input', onInput);

  return () => {
    unsubscribe();
    root.removeEventListener('input', onInput);
  };
}

/**
 * Wrap each `slot="start-icon"` / `slot="end-icon"` child of the host in the
 * decorative wrapper the behavior projects aria-hidden onto, and seat the field
 * and the wrappers in the row the classes lay out as a grid. The wrappers ride
 * InputGroup's addon parts, so there is one affix vocabulary. The light DOM has
 * no slot assignment, so the slot attribute is only the author's marker.
 */
export function wrapInputIcons(host: HTMLElement): void {
  const field = host.querySelector<HTMLElement>(':scope > [data-part="input"]');
  if (!field || field.closest('[data-part="row"]')) return;
  const start = host.querySelector(':scope > [slot="start-icon"]');
  const end = host.querySelector(':scope > [slot="end-icon"]');
  if (!start && !end) return;
  const config: InputConfig = { startIcon: start !== null, endIcon: end !== null };
  const classes = inputClassSet(config, inputBehavior.initialState(config));
  const row = document.createElement('div');
  row.dataset['part'] = 'row';
  row.className = classes.row;
  host.insertBefore(row, field);
  const seat = (child: Element | null, position: 'start' | 'end') => {
    if (!child) return;
    const addon = document.createElement('div');
    addon.dataset['part'] = addonPart(position);
    addon.dataset['position'] = position;
    addon.className = classes[position === 'start' ? 'addonStart' : 'addonEnd'];
    const wrapper = document.createElement('span');
    wrapper.dataset['part'] = position === 'start' ? 'startIcon' : 'endIcon';
    wrapper.dataset['icon'] = position === 'start' ? 'inline-start' : 'inline-end';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.className = classes[position === 'start' ? 'startIcon' : 'endIcon'];
    child.removeAttribute('slot');
    wrapper.appendChild(child);
    addon.appendChild(wrapper);
    row.appendChild(addon);
  };
  seat(start, 'start');
  row.appendChild(field);
  seat(end, 'end');
  field.className = classes.rowInput;
}
