import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';

/**
 * Textarea: a multi-line text field. The multi-line sibling of Input in the
 * text-input family -- same archetype (primary state is a VALUE), same
 * controlled/uncontrolled boundary, same validity projection. Only the native
 * element changes: a `<textarea>` instead of an `<input>`.
 *
 * The value is controlled/uncontrolled per the ownership-of-truth boundary
 * applied to a string: config.value is the consumer's controlled value (passed
 * fresh, never stored); state.value is the intrinsic value seeded from
 * defaultValue. Projections and the change callback read the EFFECTIVE value
 * via effectiveValue().
 *
 * The native <textarea> owns caret, IME composition, selection, and line
 * wrapping -- the score does NOT re-implement text editing. It only reflects
 * the value, gates setValue on disabled/readonly, and projects validity aria.
 * That makes this the same effect-free, keymap-free bind Input is: value-sync
 * plus aria, no effects, no keymap.
 */
export interface TextareaConfig {
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
}

export interface TextareaState {
  /** Intrinsic value -- ignored while a controlled value is present. */
  value: string;
}

export type TextareaActions = {
  /** Write a new value (payload: the next string). */
  setValue: string;
};

export type TextareaPart = 'textarea' | 'error';

/** The effective value: a controlled value shadows the intrinsic state. */
export function effectiveValue(state: TextareaState, config: TextareaConfig): string {
  return config.value ?? state.value;
}

/** Edits are refused while disabled or read-only. */
function isEditable(config: TextareaConfig): boolean {
  return !config.disabled && !config.readonly;
}

const textarea: Slice<TextareaConfig, TextareaState, TextareaActions, TextareaPart> = {
  name: 'textarea',
  parts: {
    textarea: {},
    // The error message is a sibling the consumer renders (Field/FormMessage),
    // referenced by aria-describedby via its id -- like dialog's title and
    // description, this part carries no aria of its own, only an id target.
    error: { optional: true },
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
      textarea: {
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
    };
  },
  // The native <textarea> owns every key: no keymap action to claim.
  keymap: () => null,
};

export const textareaBehavior: BehaviorSpec<
  TextareaConfig,
  TextareaState,
  TextareaActions,
  TextareaPart
> = compose('textarea', textarea);

/**
 * The DOM-native binding of the textarea score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React (retained-mode) reads
 * the projections declaratively instead.
 *
 * The simplest bind in the family: because the score has no effects and no
 * keymap, there is no effect runner and no keydown listener. The bind does
 * exactly two things on every state change -- project validity aria onto the
 * textarea part, and sync the textarea's .value property to the effective
 * value -- plus one listener that turns the native 'input' event into a
 * setValue dispatch. The native <textarea> keeps ownership of caret, IME,
 * selection, and wrapping.
 */
export function bindTextarea(root: HTMLElement): () => void {
  const textareaEl = root.querySelector<HTMLTextAreaElement>('[data-part="textarea"]');
  if (!textareaEl) return () => {};

  const config: TextareaConfig = {
    disabled: textareaEl.disabled,
    readonly: textareaEl.readOnly,
    required: textareaEl.required || textareaEl.getAttribute('aria-required') === 'true',
    invalid: textareaEl.getAttribute('aria-invalid') === 'true' || root.hasAttribute('invalid'),
    // Seed the intrinsic value from the server-rendered markup. A <textarea>
    // holds its initial value as child text, which the browser reflects onto
    // the .value property -- so this reads the seeded content regardless of the
    // attribute quirk. WC/Astro are uncontrolled, so config.value stays
    // undefined.
    defaultValue: textareaEl.value,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'textarea' ? textareaEl : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(textareaBehavior, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<TextareaPart>;
  for (const part of Object.keys(textareaBehavior.parts) as TextareaPart[]) {
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
    const projection = textareaBehavior.aria(state, config, ids);
    for (const part of Object.keys(projection) as TextareaPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Value-sync: write only when the DOM and the effective value diverge, so
    // the caret is preserved in the common typing case (after a setValue the
    // element already holds the value). A controlled field whose consumer
    // pins config.value would revert a rejected edit here.
    const eff = effectiveValue(state, config);
    if (textareaEl.value !== eff) textareaEl.value = eff;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onInput = (event: Event) => {
    if (event.target !== textareaEl) return;
    dispatch('setValue', config, textareaEl.value);
  };
  root.addEventListener('input', onInput);

  return () => {
    unsubscribe();
    root.removeEventListener('input', onInput);
  };
}
