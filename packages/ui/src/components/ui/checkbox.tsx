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
import classy from '../../primitives/classy';
import {
  checkboxBaseClasses,
  checkboxSizeClasses,
  checkboxVariantClasses,
} from './checkbox.classes';

export interface CheckboxProps
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
const variantClasses = checkboxVariantClasses;
const sizeClasses = checkboxSizeClasses;

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
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

    const handleToggle = React.useCallback(() => {
      if (disabled) return;

      const newChecked = !checked;

      if (!isControlled) {
        setUncontrolledChecked(newChecked);
      }

      onCheckedChange?.(newChecked);
    }, [checked, isControlled, onCheckedChange, disabled]);

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        handleToggle();
        onClick?.(event);
      },
      [handleToggle, onClick],
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        // Space key toggles the checkbox (Enter is handled by button click)
        if (event.key === ' ') {
          event.preventDefault();
          handleToggle();
        }
        onKeyDown?.(event);
      },
      [handleToggle, onKeyDown],
    );

    // Get variant and size classes with explicit defaults
    const v = variantClasses[variant] || variantClasses.default;
    const s = sizeClasses[size] || sizeClasses.default;

    // Base styles per docs/COMPONENT_STYLING_REFERENCE.md
    const cls = classy(checkboxBaseClasses, s?.box, v?.border, v?.checked, v?.ring, className);

    return (
      // biome-ignore lint/a11y/useSemanticElements: Custom checkbox with visual styling not possible with native input
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        className={cls}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {checked && (
          <svg
            className={s?.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
