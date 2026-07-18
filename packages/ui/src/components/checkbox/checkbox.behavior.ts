import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { formValueAttrs } from '../../primitives/form-value';

/**
 * Checkbox: a tri-state, form-associated control. The root is a native
 * `<button role="checkbox">`, so the browser converts Enter/Space to a click
 * and the bind wires click -> toggle only (the button archetype -- see
 * bindButton). One score, three thin performances.
 *
 * Tri-state (`checked | unchecked | indeterminate`) is the new capability the
 * old tree never had: old/ui/checkbox.tsx and checkbox.element.ts are binary
 * (a `checked` attribute, aria-checked true/false). The port adds the mixed
 * state -- `aria-checked="mixed"`, `data-state="indeterminate"` -- and toggles
 * an indeterminate box to checked, matching a native `<input type=checkbox>`.
 *
 * NOT folded in: the `pressable` slice. It is binary (`pressed: boolean`) and
 * projects `aria-pressed` plus a `data-state` on root, which would collide with
 * the checkbox `data-state` under compose(). The checkbox imitates the press
 * SHAPE -- its own slice, composed, plus a shared bind -- rather than reusing
 * the toggle-button reducer.
 *
 * Form association rides the form-value primitive: a mirrored hidden `<input>`
 * carries `name`/`value` into a `<form>` submission, present-but-disabled while
 * the box is unchecked or indeterminate so an unchecked control submits nothing
 * (the old element's `setFormValue(null)`).
 */
export type CheckboxVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type CheckboxSize = 'sm' | 'default' | 'lg';

/** The three-way checked axis, shadcn/Radix-compatible. */
export type CheckedState = boolean | 'indeterminate';

export interface CheckboxConfig {
  /** Controlled checked (`true` | `false` | `'indeterminate'`). */
  checked?: CheckedState | undefined;
  /** Uncontrolled seed. */
  defaultChecked?: CheckedState | undefined;
  /** Disable the control (native `disabled`, not `aria-disabled`). */
  disabled?: boolean | undefined;
  /** Require a checked box for form validity. */
  required?: boolean | undefined;
  /** Form field name -- drives the mirrored hidden input (form-value). */
  name?: string | undefined;
  /** Value submitted when checked; defaults to `'on'` (native convention). */
  value?: string | undefined;
  variant?: CheckboxVariant | undefined;
  size?: CheckboxSize | undefined;
}

export interface CheckboxState {
  /** Intrinsic checked axis. */
  checked: CheckedState;
}

export type CheckboxActions = {
  /** Space or click: unchecked/indeterminate -> checked, checked -> unchecked. */
  toggle: undefined;
};

export type CheckboxPart = 'root';

/** The effective checked value: controlled config shadows intrinsic state. */
export function effectiveChecked(state: CheckboxState, config: CheckboxConfig): CheckedState {
  return config.checked ?? state.checked;
}

/** Whether the effective state carries a submittable value (checked === true). */
export function isCheckboxChecked(state: CheckboxState, config: CheckboxConfig): boolean {
  return effectiveChecked(state, config) === true;
}

const checkboxSlice: Slice<CheckboxConfig, CheckboxState, CheckboxActions, CheckboxPart> = {
  name: 'checkbox',
  parts: {
    root: {},
  },
  initialState: (config) => ({
    checked: config.checked ?? config.defaultChecked ?? false,
  }),
  actions: {
    // Native tri-state: a checked box unchecks; unchecked AND indeterminate
    // boxes both become checked. `toggle` therefore never PRODUCES mixed --
    // only a controlled `checked='indeterminate'` seeds it.
    toggle: (state) => ({ checked: state.checked === true ? false : true }),
  },
  // The whole control gates on `disabled`; there is no soft-disabled axis.
  canDispatch: (_state, action, config) =>
    action === 'toggle' ? !(config.disabled ?? false) : true,
  aria: (state, config) => {
    const checked = effectiveChecked(state, config);
    const disabled = config.disabled ?? false;
    const dataState =
      checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked';
    return {
      root: {
        role: 'checkbox',
        'aria-checked': checked === 'indeterminate' ? 'mixed' : checked ? 'true' : 'false',
        'aria-required': config.required ? 'true' : undefined,
        'data-state': dataState,
        'data-disabled': disabled ? '' : undefined,
      },
    };
  },
  // Space is the canonical checkbox key. Enter also toggles, but via the native
  // button's click (framework affordance) -- the bind wires click only, so no
  // keydown branch claims it here.
  keymap: (event, _state, part) => (part === 'root' && event.key === ' ' ? 'toggle' : null),
  effects: () => [],
};

export const checkbox: BehaviorSpec<CheckboxConfig, CheckboxState, CheckboxActions, CheckboxPart> =
  compose('checkbox', checkboxSlice);

/** The value the mirrored hidden input carries when checked (native `'on'`). */
export function checkboxSubmitValue(config: CheckboxConfig): string {
  return config.value ?? 'on';
}

/**
 * The DOM-native binding of the checkbox score -- the client the Web Component
 * and the Astro <script> both import. React (retained-mode) reads the
 * projections declaratively instead. `root` is the native inner button; the
 * mirrored hidden input is its sibling inside the host, kept in sync (value +
 * disabled) so form submission matches the checked axis.
 */
export function bindCheckbox(root: HTMLElement): () => void {
  const initialDataState = root.getAttribute('data-state');
  const defaultChecked: CheckedState =
    initialDataState === 'checked'
      ? true
      : initialDataState === 'indeterminate'
        ? 'indeterminate'
        : false;

  const config: CheckboxConfig = {
    disabled: root.hasAttribute('disabled') || root.dataset['disabled'] === '',
    required: root.hasAttribute('required') || root.getAttribute('aria-required') === 'true',
    name: root.getAttribute('name') ?? undefined,
    value: root.getAttribute('value') ?? undefined,
    defaultChecked,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(checkbox, config);

  // ids READ from the markup; checkbox carries no id-ref aria, but the
  // projection contract still takes them.
  const ids = {} as PartIds<CheckboxPart>;
  for (const part of Object.keys(checkbox.parts) as CheckboxPart[])
    ids[part] = getPart(part)?.id ?? '';

  // Apply a resolved projection raw (validate:false skips aria-manager's
  // author-input coercion that would flip the string 'false' to truthy).
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  // The mirrored hidden input is a sibling of the root button inside the host.
  const hiddenInput = (): HTMLInputElement | null =>
    root.parentElement?.querySelector<HTMLInputElement>('input[data-part="hidden-input"]') ?? null;

  const render = () => {
    const state = memory.get();
    const projection = checkbox.aria(state, config, ids);
    for (const part of Object.keys(projection) as CheckboxPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }

    // Form-value mirror: the input carries the value only when checked and
    // enabled; unchecked/indeterminate/disabled boxes are excluded from submit.
    const input = hiddenInput();
    if (input) {
      input.value = checkboxSubmitValue(config);
      input.disabled = !isCheckboxChecked(state, config) || (config.disabled ?? false);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Native <button> converts Enter/Space to click; the click dispatches toggle.
  const onClick = (event: Event) => {
    if (config.disabled) {
      event.preventDefault();
      return;
    }
    dispatch('toggle', config);
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    root.removeEventListener('click', onClick);
  };
}

export { formValueAttrs };
