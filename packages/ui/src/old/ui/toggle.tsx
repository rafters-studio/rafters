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
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import { toggleBaseClasses, toggleSizeClasses, toggleVariantClasses } from './toggle.classes';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'accent'
    | 'outline'
    | 'ghost';
  /** Size variant */
  size?: 'default' | 'sm' | 'lg';
  /** Controlled pressed state */
  pressed?: boolean;
  /** Default pressed state for uncontrolled usage */
  defaultPressed?: boolean;
  /** Callback when pressed state changes */
  onPressedChange?: (pressed: boolean) => void;
  /** Render as child element (polymorphic) */
  asChild?: boolean;
}

export function Toggle({
  className,
  variant = 'default',
  size = 'default',
  pressed: controlledPressed,
  defaultPressed = false,
  onPressedChange,
  asChild = false,
  onClick,
  ...props
}: ToggleProps) {
  // State management (controlled vs uncontrolled)
  const [uncontrolledPressed, setUncontrolledPressed] = React.useState(defaultPressed);
  const isControlled = controlledPressed !== undefined;
  const pressed = isControlled ? controlledPressed : uncontrolledPressed;

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const newPressed = !pressed;

      if (!isControlled) {
        setUncontrolledPressed(newPressed);
      }

      onPressedChange?.(newPressed);
      onClick?.(event);
    },
    [pressed, isControlled, onPressedChange, onClick],
  );

  const cls = classy(
    toggleBaseClasses,
    toggleVariantClasses[variant] ?? '',
    toggleSizeClasses[size] ?? '',
    className,
  );

  const buttonProps = {
    'aria-pressed': pressed,
    'data-state': pressed ? 'on' : 'off',
    className: cls,
    onClick: handleClick,
    ...props,
  };

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(buttonProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return (
    <button type="button" {...buttonProps}>
      {props.children}
    </button>
  );
}

Toggle.displayName = 'Toggle';

export default Toggle;
