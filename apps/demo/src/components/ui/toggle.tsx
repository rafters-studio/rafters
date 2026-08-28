/**
 * Toggle button component for stateful button interactions
 *
 * @cognitive-load 2/10 - Clear binary state with button affordance
 * @attention-economics State toggle: pressed state visually distinct, immediate feedback
 * @trust-building Immediate visual feedback, reversible action, clear pressed/unpressed state
 * @accessibility aria-pressed state, keyboard toggle (Space/Enter), visible focus ring
 * @semantic-meaning Binary toggle button: on=active/enabled, off=inactive/disabled
 *
 * @usage-patterns
 * DO: Use for toolbar buttons that toggle features (bold, italic, etc.)
 * DO: Use for view mode toggles (grid/list view)
 * DO: Make pressed state visually distinct
 * DO: Use icons with text labels for clarity
 * NEVER: Use for form submissions, use for navigation
 *
 * @example
 * ```tsx
 * <Toggle aria-label="Toggle bold">
 *   <Bold className="h-4 w-4" />
 * </Toggle>
 * ```
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  toggle,
  type ToggleActions,
  type ToggleConfig,
  type TogglePart,
  type ToggleSize,
  type ToggleVariant,
} from '@/components/ui/toggle.behavior';
import { toggleClasses } from '@/components/ui/toggle.classes';

export { toggleVariants } from '@/components/ui/toggle.classes';
export type { ToggleSize, ToggleVariant };

/**
 * Two-state press button. Dispatches a press that flips `aria-pressed`
 * on/off; Enter/Space activate natively; the pressed state rides
 * `data-[state=on]` for the fill swap.
 *
 * @cognitive-load 2/10 - decision 1, information 1, interaction 0, disruption
 * 0, learning 0. One control, one binary decision (on or off) with immediate,
 * reversible feedback; the pressed fill is the only state to read. A
 * universally learned button affordance, no disruption.
 * @attention-economics State toggle: the pressed fill is visually distinct from
 * the transparent idle rest state, giving immediate feedback. Belongs in the
 * low-attention register -- toolbars and view-mode switches -- not as a
 * primary call to action.
 * @trust-building Immediate visual feedback on every press, a fully reversible
 * action, and a pressed/unpressed state that never hides: the control stays
 * focusable and discoverable rather than vanishing.
 * @accessibility Native `<button>` semantics (role, Enter/Space) are preserved;
 * `aria-pressed` is always projected because a toggle is always in toggle mode.
 * Hard-disabled uses the native `disabled` attribute only, with no redundant
 * `aria-disabled`. Icon-only toggles must carry an `aria-label` (passed through
 * to the button).
 */
export interface ToggleProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  variant?: ToggleVariant;
  size?: ToggleSize;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>((props, ref) => {
  const {
    className,
    variant = 'default',
    size = 'default',
    disabled = false,
    pressed,
    defaultPressed = false,
    onPressedChange,
    onClick,
    children,
    type,
    ...rest
  } = props;

  const config: ToggleConfig = {
    variant,
    size,
    toggle: true,
    defaultPressed,
    disabled,
  };

  // The controller composes the score with the substrate directly -- no
  // useBehavior. createBehavior is the model, useMemory subscribes. Toggle has
  // no effects (no loading/announce), so no effect runner is wired.
  const { memory, dispatch } = React.useMemo(() => createBehavior(toggle, config), []);
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
  // (the `pressed` prop when controlled) against the INTRINSIC value after the
  // reducer -- never effective-vs-effective, which a controlled prop would pin
  // flat. A toggle press always flips; canDispatch gates the disabled case.
  const latest = React.useRef({ config, pressed, onPressedChange });
  latest.current = { config, pressed, onPressedChange };
  const request = React.useCallback(
    (action: keyof ToggleActions): boolean => {
      const { config: cfg, pressed: ctrl, onPressedChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(ctrl === undefined ? memory.get().pressed === true : !ctrl);
      return true;
    },
    [dispatch, memory],
  );

  const uid = React.useId();
  const ids = {} as PartIds<TogglePart>;
  for (const part of Object.keys(toggle.parts) as TogglePart[]) ids[part] = `${uid}-${part}`;
  const aria = toggle.aria(state, config, ids);
  const classes = toggleClasses(config, state);

  return (
    <button
      ref={setRef}
      type={type ?? 'button'}
      disabled={disabled}
      data-part="root"
      id={ids.root}
      className={classy(classes.root, className)}
      {...aria.root}
      onClick={(event) => {
        if (!request('press')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <span data-part="label" id={ids.label}>
        {children}
      </span>
    </button>
  );
});

Toggle.displayName = 'Toggle';
export default Toggle;
