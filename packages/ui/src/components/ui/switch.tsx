/**
 * Toggle switch component for on/off binary states
 *
 * @cognitive-load 2/10 - Clear binary state with immediate visual feedback
 * @attention-economics Low attention: thumb position communicates state instantly
 * @trust-building Immediate state change, reversible action, physical metaphor (light switch)
 * @accessibility Keyboard toggle (Space), proper ARIA checked state, motion for state transition
 * @semantic-meaning Binary toggle: on=enabled/active, off=disabled/inactive. Use for settings with immediate effect
 *
 * @usage-patterns
 * DO: Use for settings that take effect immediately
 * DO: Pair with descriptive label explaining what the switch controls
 * DO: Use when action is reversible without consequence
 * DO: Position consistently (left of label or right-aligned)
 * NEVER: Use for form submissions, use for actions requiring confirmation
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Switch id="notifications" />
 *   <Label htmlFor="notifications">Enable notifications</Label>
 * </div>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  switchSizeClasses,
  switchThumbBaseClasses,
  switchThumbTransitionClasses,
  switchThumbUncheckedClasses,
  switchTrackBaseClasses,
  switchTrackDisabledClasses,
  switchTrackFocusClasses,
  switchTrackShapeClasses,
  switchTrackTransitionClasses,
  switchTrackUncheckedClasses,
  switchVariantClasses,
} from './switch.classes';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Controlled checked state */
  checked?: boolean;
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'accent';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

// Re-export variant and size classes from shared file
const variantClasses = switchVariantClasses;
const sizeClasses = switchSizeClasses;

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      onClick,
      onKeyDown,
      disabled,
      variant = 'default',
      size = 'default',
      ...props
    },
    ref,
  ) => {
    // State management (controlled vs uncontrolled)
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const toggle = React.useCallback(() => {
      const newChecked = !checked;

      if (!isControlled) {
        setUncontrolledChecked(newChecked);
      }

      onCheckedChange?.(newChecked);
    }, [checked, isControlled, onCheckedChange]);

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        toggle();
        onClick?.(event);
      },
      [disabled, toggle, onClick],
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        // Space key toggles the switch (Enter is handled by button click)
        if (event.key === ' ') {
          event.preventDefault();
          if (!disabled) {
            toggle();
          }
        }
        onKeyDown?.(event);
      },
      [disabled, toggle, onKeyDown],
    );

    // Get variant and size classes with explicit defaults
    const v = variantClasses[variant] || variantClasses.default;
    const s = sizeClasses[size] || sizeClasses.default;

    // Track (background) styles per docs/COMPONENT_STYLING_REFERENCE.md
    const trackClasses = classy(
      switchTrackBaseClasses,
      s?.track,
      switchTrackShapeClasses,
      switchTrackTransitionClasses,
      switchTrackFocusClasses,
      v?.ring,
      switchTrackDisabledClasses,
      checked ? v?.checked : switchTrackUncheckedClasses,
      className,
    );

    // Thumb (movable indicator) styles
    const thumbClasses = classy(
      switchThumbBaseClasses,
      s?.thumb,
      switchThumbTransitionClasses,
      checked ? s?.translate : switchThumbUncheckedClasses,
    );

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        className={trackClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className={thumbClasses} />
      </button>
    );
  },
);

Switch.displayName = 'Switch';

export default Switch;
