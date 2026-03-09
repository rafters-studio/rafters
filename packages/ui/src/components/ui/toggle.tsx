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

// Variant classes for pressed state per docs/COMPONENT_STYLING_REFERENCE.md
const variantClasses: Record<string, string> = {
  default:
    'bg-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted',
  primary:
    'bg-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted',
  secondary:
    'bg-transparent data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground hover:bg-muted',
  destructive:
    'bg-transparent data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground hover:bg-muted',
  success:
    'bg-transparent data-[state=on]:bg-success data-[state=on]:text-success-foreground hover:bg-muted',
  warning:
    'bg-transparent data-[state=on]:bg-warning data-[state=on]:text-warning-foreground hover:bg-muted',
  info: 'bg-transparent data-[state=on]:bg-info data-[state=on]:text-info-foreground hover:bg-muted',
  accent:
    'bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted',
  outline:
    'border border-input bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted',
  ghost:
    'bg-transparent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-accent hover:text-accent-foreground',
};

const sizeClasses: Record<string, string> = {
  default: 'h-10 px-3',
  sm: 'h-9 px-2.5',
  lg: 'h-11 px-5',
};

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

  // Base styles per docs/COMPONENT_STYLING_REFERENCE.md
  const baseClasses =
    'inline-flex items-center justify-center ' +
    'rounded-md ' +
    'text-sm font-medium ' +
    'transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50';

  const cls = classy(
    baseClasses,
    variantClasses[variant] ?? '',
    sizeClasses[size] ?? '',
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
