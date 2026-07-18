import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';

/**
 * Switch: a binary on/off control (role=switch). The archetype answer for a
 * control whose primary state is a CHECKED flag with thumb travel between two
 * ends -- the toggle-family sibling of button's press.
 *
 * Its own slice, not a fold of `pressable`: pressable projects the
 * button-specific `aria-pressed`/`aria-busy`/`data-state:idle|loading` surface
 * and owns `spinner`/`label` parts; the switch axis is `role=switch` +
 * `aria-checked` + `data-state:checked|unchecked` over a `thumb`. The shape is
 * imitated (one slice + a `bindSwitch` modeled on `bindButton`), the projection
 * is the switch's own -- exactly the precedent `input.behavior.ts` set for "my
 * axis matches no existing slice".
 *
 * Controlled/uncontrolled per the same ownership-of-truth boundary as
 * input/disclosable: `config.checked` is the consumer's controlled value
 * (passed fresh, never stored); `state.checked` is the intrinsic value seeded
 * from `defaultChecked`. Projections and the change callback read the EFFECTIVE
 * value via `effectiveChecked()`.
 *
 * The form-value axis (`name`/`value`/`required` -> submitted value + validity)
 * lives in the score as the pure `switchFormValue()` projection. The old shadow
 * WC wired it through ElementInternals; the behavior-layer WC is a thin
 * light-DOM enhancer (see the oracle table in docs/spec/components/switch.md),
 * so the axis is exposed as pure data a form adapter can read, not rebuilt as a
 * lifecycle machine in a decorator.
 */
export type SwitchVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type SwitchSize = 'sm' | 'default' | 'lg';

export interface SwitchConfig {
  variant: SwitchVariant;
  size: SwitchSize;
  /** Controlled checked: shadows the intrinsic state when present. */
  checked?: boolean | undefined;
  /** Uncontrolled seed for the intrinsic checked state. */
  defaultChecked?: boolean | undefined;
  /** No toggle while disabled (native attribute owns interaction; the gate
   *  also covers the programmatic path). */
  disabled?: boolean | undefined;
  /** Form-value axis: the value submitted under `name` when checked
   *  (defaults to "on", the HTML checkbox convention). */
  value?: string | undefined;
  /** Form-value axis: the field name a form adapter submits under. */
  name?: string | undefined;
  /** Constraint: a required switch is invalid while unchecked. */
  required?: boolean | undefined;
}

export interface SwitchState {
  /** Intrinsic checked -- ignored while a controlled value is present. */
  checked: boolean;
}

export type SwitchActions = {
  /** Flip the intrinsic checked flag. */
  toggle: undefined;
};

export type SwitchPart = 'root' | 'thumb';

/** The effective checked: a controlled value shadows the intrinsic state. */
export function effectiveChecked(state: SwitchState, config: SwitchConfig): boolean {
  return config.checked ?? state.checked;
}

/** The form-value projection: what a form adapter submits and the constraint
 *  validity, both derived from the effective checked state. Pure data -- the
 *  score's answer to the form-value axis. */
export interface SwitchFormValue {
  /** The value submitted under `name`; `null` omits the field entirely. */
  value: string | null;
  /** Constraint-validation flags mirroring the required axis. */
  validity: { valueMissing: boolean };
}

export function switchFormValue(state: SwitchState, config: SwitchConfig): SwitchFormValue {
  const checked = effectiveChecked(state, config);
  return {
    value: checked ? (config.value ?? 'on') : null,
    validity: { valueMissing: config.required === true && !checked },
  };
}

const switchSlice: Slice<SwitchConfig, SwitchState, SwitchActions, SwitchPart> = {
  name: 'switch',
  parts: {
    // role lives in the PartDecl (asserted by the harness) and is set once in
    // the server/author markup -- like button's static type="button" -- never
    // re-projected, since it never changes.
    root: { role: 'switch' },
    thumb: {},
  },
  initialState: (config) => ({ checked: config.checked ?? config.defaultChecked ?? false }),
  actions: {
    toggle: (state) => ({ ...state, checked: !state.checked }),
  },
  // The gate: a disabled switch rejects toggle, so a controlled consumer's
  // callback never fires for a change the switch would not have accepted.
  canDispatch: (_state, action, config) => (action === 'toggle' ? !config.disabled : true),
  aria: (state, config) => {
    const checked = effectiveChecked(state, config);
    const dataState = checked ? 'checked' : 'unchecked';
    return {
      root: {
        // Always 'true'/'false' -- the switch reflects its binary state. The
        // 'false' string is why the DOM bind applies with {validate:false}:
        // aria-manager would otherwise coerce it truthy.
        'aria-checked': checked ? 'true' : 'false',
        'aria-required': config.required ? 'true' : undefined,
        'data-state': dataState,
      },
      // The thumb is decorative (aria-hidden); its data-state drives the CSS
      // travel selector, so the bind flips it and the stylesheet animates.
      thumb: { 'aria-hidden': 'true', 'data-state': dataState },
    };
  },
  // Native <button> converts Enter/Space to a click, so the bind wires click
  // only; this keymap is the pure record of the activation keys (Spec 01).
  keymap: (event, _state, part) =>
    part === 'root' && (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter')
      ? 'toggle'
      : null,
  // No focus-trap, no roving, no announce -- the simplest bind shape.
  effects: () => [],
};

export const switchBehavior: BehaviorSpec<SwitchConfig, SwitchState, SwitchActions, SwitchPart> =
  compose('switch', switchSlice);

/**
 * The DOM-native binding of the switch score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React (retained-mode) reads the
 * projections declaratively instead.
 *
 * Archetype notes (toggle-family, like bindButton):
 * - The `root` is a native <button role="switch">, so Enter/Space are fulfilled
 *   by the browser as a click. The bind wires click -> toggle ONLY; there is no
 *   keydown branch (a keydown Space handler that also toggled would double-fire
 *   against the native click -- the trap the old React code fought with
 *   preventDefault).
 * - Disabled is native `disabled` only (no aria-disabled), matching button's
 *   hard-disabled; a suppressed toggle also cancels the click default.
 * - No effects, so no runner: the bind projects aria/data-state and dispatches
 *   a native `change` event on a real toggle (preserving the old WC's change
 *   contract for form/consumer listeners).
 */
export function bindSwitch(root: HTMLElement): () => void {
  // Config is READ from the projected markup (server- or author-minted), never
  // generated. variant/size only drive classes (already server-rendered), so
  // the bind carries their defaults; they never reach the score's projections.
  const config: SwitchConfig = {
    variant: 'default',
    size: 'default',
    disabled: root.hasAttribute('disabled'),
    defaultChecked: root.getAttribute('aria-checked') === 'true',
    required: root.getAttribute('aria-required') === 'true',
    value: root.getAttribute('data-value') ?? undefined,
    name: root.getAttribute('data-name') ?? undefined,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(switchBehavior, config);

  // ids are READ from the markup; switch carries no id-ref aria, but the
  // projection contract still takes them.
  const ids = {} as PartIds<SwitchPart>;
  for (const part of Object.keys(switchBehavior.parts) as SwitchPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion,
  // which would re-read the resolved string 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = switchBehavior.aria(state, config, ids);
    for (const part of Object.keys(projection) as SwitchPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint (baseline)

  const onClick = (event: Event) => {
    if (!dispatch('toggle', config)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    root.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    root.removeEventListener('click', onClick);
  };
}
