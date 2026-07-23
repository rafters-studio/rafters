import * as React from 'react';
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  switchBehavior,
  type SwitchActions,
  type SwitchConfig,
  type SwitchPart,
  type SwitchSize,
  type SwitchVariant,
} from '@/components/ui/switch.behavior';
import { switchClasses } from '@/components/ui/switch.classes';

export { switchVariants } from '@/components/ui/switch.classes';
export type { SwitchSize, SwitchVariant };

/**
 * Switch -- the React performance of the switch score. The shadcn Switch
 * surface: a lone <button role="switch"> with a thumb, controlled/uncontrolled
 * `checked` and `onCheckedChange`, plus the rafters `variant`/`size` extensions.
 *
 * Thin by construction: the score is projection-only, so the controller just
 * wires memory + classes -- no host and no getPart registry beyond the toggle
 * request. The value/name/required props ride the form-value axis into the
 * score's projection; native form submission is a form adapter's job (the
 * button carries no native form value), tracked in the component doc.
 *
 * @cognitive-load 2/10 - decision 1, information 1, interaction 0, disruption
 * 0, learning 0. One control, one binary decision (on or off); the thumb
 * position is the only information to read. Universally learned light-switch
 * affordance, no disruption, nothing to learn.
 * @attention-economics Low-attention surface: the thumb position communicates
 * state at a glance, so a switch never competes for attention the way a
 * primary-action button does. Pair one per setting; do not stack switches that
 * gate each other.
 * @trust-building Immediate, reversible state change with a physical metaphor;
 * the disabled gate keeps an unavailable toggle from firing while staying
 * discoverable, and the change is undoable without consequence.
 * @accessibility Native <button> semantics carry Enter/Space activation;
 * `role="switch"` + `aria-checked` announce the binary state, `aria-required`
 * advertises the constraint, and the thumb is `aria-hidden`. The control has no
 * intrinsic text, so consumers MUST supply an accessible name (a paired
 * <label>, `aria-label`, or `aria-labelledby`). Hard-disabled uses native
 * `disabled` only.
 */
export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'value'
> {
  /** Controlled checked: shadows the intrinsic state when present. */
  checked?: boolean;
  /** Uncontrolled seed for the intrinsic checked state. */
  defaultChecked?: boolean;
  /** Semantic change callback: fires on a real toggle with the checked value
   *  the consumer should adopt next (the intrinsic-after value, so a controlled
   *  switch still reports every change). */
  onCheckedChange?: (checked: boolean) => void;
  variant?: SwitchVariant;
  size?: SwitchSize;
  /** Form-value axis: the value submitted under `name` when checked. */
  value?: string;
  /** Constraint advertised to AT via aria-required. */
  required?: boolean;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {
  const {
    className,
    checked,
    defaultChecked = false,
    onCheckedChange,
    variant = 'default',
    size = 'default',
    disabled = false,
    name,
    value,
    required = false,
    onClick,
    ...rest
  } = props;

  const config: SwitchConfig = {
    variant,
    size,
    checked,
    defaultChecked,
    disabled,
    name,
    value,
    required,
  };

  // The controller composes the score with the substrate directly -- no
  // useBehavior. createBehavior is the model, useMemory subscribes.
  const { memory, dispatch } = React.useMemo(() => createBehavior(switchBehavior, config), []);
  const state = useMemory(memory);

  const rootRef = React.useRef<HTMLButtonElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLButtonElement | null) => {
      rootRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  // Gotcha #1: the controlled callback compares the EFFECTIVE value before
  // (the `checked` prop when controlled) against the INTRINSIC value after the
  // reducer -- never effective-vs-effective, which a controlled prop would pin
  // flat. A toggle always flips, so no equality guard is needed; canDispatch
  // already gates the disabled case. Riding in a ref keeps the latest config
  // and callback off the dispatch closure.
  const latest = React.useRef({ config, checked, onCheckedChange });
  latest.current = { config, checked, onCheckedChange };
  const request = React.useCallback(
    (action: keyof SwitchActions): boolean => {
      const { config: cfg, checked: ctrl, onCheckedChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(ctrl === undefined ? memory.get().checked : !ctrl);
      return true;
    },
    [dispatch, memory],
  );

  const uid = React.useId();
  const ids = {} as PartIds<SwitchPart>;
  for (const part of Object.keys(switchBehavior.parts) as SwitchPart[])
    ids[part] = `${uid}-${part}`;
  const aria = switchBehavior.aria(state, config, ids);
  const classes = switchClasses(config, state);

  // The thumb is a decorative element (aria-hidden), not a typography role; it
  // is built with createElement so the class string is plain composition, the
  // same escape the card title/description use for raw elements.
  const thumb = React.createElement('span', {
    'data-part': 'thumb',
    id: ids.thumb,
    className: classes.thumb,
    ...aria.thumb,
  });

  return (
    <button
      ref={setRef}
      type="button"
      role="switch"
      disabled={disabled}
      name={name}
      value={value}
      data-part="root"
      id={ids.root}
      className={classy(classes.root, className)}
      {...aria.root}
      onClick={(event) => {
        if (!request('toggle')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {thumb}
    </button>
  );
});

Switch.displayName = 'Switch';
export default Switch;
