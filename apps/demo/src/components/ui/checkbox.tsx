/**
 * Checkbox component for binary selections in forms
 *
 * @cognitive-load 2/10 - Simple binary choice with clear visual state
 * @attention-economics Low attention demand: passive until interaction, clear checked/unchecked states
 * @trust-building Immediate visual feedback, reversible action, clear association with label
 * @accessibility Keyboard toggle (Space), proper ARIA checked state, visible focus indicator
 * @semantic-meaning Binary selection: checked=enabled/selected, unchecked=disabled/deselected
 *
 * @usage-patterns
 * DO: Always pair with a descriptive Label component
 * DO: Use for optional settings or multi-select lists
 * DO: Group related checkboxes visually
 * DO: Provide immediate visual feedback on state change
 * NEVER: Use for mutually exclusive options (use RadioGroup instead)
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Checkbox id="terms" />
 *   <Label htmlFor="terms">Accept terms and conditions</Label>
 * </div>
 * ```
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  checkbox,
  checkboxSubmitValue,
  effectiveChecked,
  formValueAttrs,
  isCheckboxChecked,
  type CheckboxConfig,
  type CheckboxPart,
  type CheckboxSize,
  type CheckboxVariant,
  type CheckedState,
} from '@/components/ui/checkbox.behavior';
import { checkboxClasses } from '@/components/ui/checkbox.classes';

export type { CheckboxSize, CheckboxVariant, CheckedState };

/**
 * Tri-state, form-associated checkbox. A native `<button role="checkbox">`, so
 * Space and Enter toggle natively; `aria-checked` carries `true`/`false`/`mixed`
 * and a mirrored hidden input carries the value into a `<form>` while checked.
 *
 * @cognitive-load 2/10 - decision 1, information 0, interaction 1, disruption 0,
 * learning 0. One binary (or tri-state) decision and one toggle interaction; the
 * checked/unchecked glyph reads at a glance so information is nil, and the
 * affordance is universally learned with no disruption.
 * @attention-economics A low-attention, passive control: it sits inert until the
 * user chooses to engage and never competes for the eye. Group related boxes and
 * pair each with a descriptive label so the choice, not the widget, holds focus.
 * @trust-building The toggle is instantly reversible with immediate visual
 * feedback, and the mixed state honestly reports a partial selection instead of
 * forcing a false binary. Hard-disabled uses native `disabled` so assistive tech
 * and the form agree on availability.
 * @accessibility `role="checkbox"` with `aria-checked` (including `"mixed"`),
 * Space toggles via the native button, the focus ring is a token ring, and
 * `aria-required` surfaces a required box. The indicator glyph is aria-hidden;
 * the accessible name comes from a paired label.
 */
export interface CheckboxProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'value' | 'checked' | 'defaultChecked'
> {
  /** Controlled checked state (`true` | `false` | `'indeterminate'`). */
  checked?: CheckedState;
  /** Default checked state for uncontrolled usage. */
  defaultChecked?: CheckedState;
  /** Fires with the next checked state on toggle. */
  onCheckedChange?: (checked: CheckedState) => void;
  /** Require a checked box for form validity. */
  required?: boolean;
  /** Form field name -- renders a mirrored hidden input. */
  name?: string;
  /** Value submitted when checked; defaults to `'on'`. */
  value?: string;
  variant?: CheckboxVariant;
  size?: CheckboxSize;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>((props, ref) => {
  const {
    className,
    checked: controlledChecked,
    defaultChecked = false,
    onCheckedChange,
    onClick,
    disabled = false,
    required = false,
    name,
    value,
    variant = 'default',
    size = 'default',
    type,
    ...rest
  } = props;

  const config: CheckboxConfig = {
    checked: controlledChecked,
    defaultChecked,
    disabled,
    required,
    name,
    value,
    variant,
    size,
  };

  // The controller composes the score with the substrate directly. createBehavior
  // is the model, useMemory subscribes; the projection reads the CURRENT config
  // each render, so a controlled `checked` prop shadows the intrinsic axis.
  const { memory, dispatch } = React.useMemo(() => createBehavior(checkbox, config), []);
  const state = useMemory(memory);

  // Gotcha #1: report the EFFECTIVE-before vs INTRINSIC-after value. A controlled
  // checkbox's effective value never moves, but the callback must still report
  // the value it should be set to next; an uncontrolled box reports its new
  // intrinsic value.
  const latest = React.useRef({ config, onCheckedChange });
  latest.current = { config, onCheckedChange };
  const request = React.useCallback((): boolean => {
    const { config: cfg, onCheckedChange: cb } = latest.current;
    const before = effectiveChecked(memory.get(), cfg);
    if (!dispatch('toggle', cfg)) return false;
    const next: CheckedState = cfg.checked !== undefined ? before !== true : memory.get().checked;
    cb?.(next);
    return true;
  }, [memory, dispatch]);

  const uid = React.useId();
  const ids = {} as PartIds<CheckboxPart>;
  for (const part of Object.keys(checkbox.parts) as CheckboxPart[]) ids[part] = `${uid}-${part}`;
  const aria = checkbox.aria(state, config, ids);
  const classes = checkboxClasses(config, state);

  const submittable = isCheckboxChecked(state, config);
  const hidden = name ? formValueAttrs({ name, value: checkboxSubmitValue(config) }) : null;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a styled tri-state checkbox is not expressible as a native <input>. */}
      <button
        ref={ref}
        type={type ?? 'button'}
        data-part="root"
        id={ids.root}
        disabled={disabled}
        className={classy(classes.root, className)}
        {...aria.root}
        onClick={(event) => {
          request();
          onClick?.(event);
        }}
        {...rest}
      >
        {/* State-swap glyphs: CSS shows exactly one per data-state, both aria-hidden. */}
        <svg
          className={classes.check}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          className={classes.dash}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>
      {hidden ? (
        <input data-part="hidden-input" {...hidden} disabled={!submittable || disabled} readOnly />
      ) : null}
    </>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
