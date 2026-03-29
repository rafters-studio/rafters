/**
 * Radio group component for mutually exclusive selections
 *
 * @cognitive-load 3/10 - Clear single choice from visible options
 * @attention-economics Options visible simultaneously: enables comparison, reduces memory load
 * @trust-building Immediate visual feedback, reversible selection, clear current state
 * @accessibility Arrow key navigation between options, proper ARIA radiogroup, roving tabindex
 * @semantic-meaning Mutually exclusive choice: only one option can be selected at a time
 *
 * @usage-patterns
 * DO: Use for 2-5 mutually exclusive options
 * DO: Make all options visible for easy comparison
 * DO: Use descriptive labels for each option
 * DO: Pre-select the most common or safest option when appropriate
 * NEVER: More than 7 options (use Select instead), independent selections (use Checkbox)
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1">
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-1" id="r1" />
 *     <Label htmlFor="r1">Option 1</Label>
 *   </div>
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-2" id="r2" />
 *     <Label htmlFor="r2">Option 2</Label>
 *   </div>
 * </RadioGroup>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  radioGroupHorizontalClasses,
  radioGroupItemBaseClasses,
  radioGroupItemIndicatorClasses,
  radioGroupVerticalClasses,
} from './radio-group.classes';

// ==================== Types ====================

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled value */
  value?: string;
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Whether the entire group is disabled */
  disabled?: boolean;
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
}

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Value that identifies this radio item */
  value: string;
}

// ==================== Context ====================

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  orientation: 'horizontal' | 'vertical';
  name: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within RadioGroup');
  }
  return context;
}

// ==================== RadioGroup ====================

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      disabled = false,
      orientation = 'vertical',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    // State management (controlled vs uncontrolled)
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    // Ref for the container
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    // Generate stable name for grouping
    const name = React.useId();

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange],
    );

    // Setup roving focus - re-initialize when orientation changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: value dependency needed to re-compute currentIndex when selection changes
    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const cleanup = createRovingFocus(container, {
        orientation,
        loop: true,
        // Find the currently checked item to set as initial index
        currentIndex: (() => {
          const items = Array.from(
            container.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'),
          );
          const checkedIndex = items.findIndex(
            (item) => item.getAttribute('aria-checked') === 'true',
          );
          return checkedIndex >= 0 ? checkedIndex : 0;
        })(),
      });

      return cleanup;
    }, [orientation, value]);

    const contextValue = React.useMemo(
      () => ({
        value,
        onValueChange: handleValueChange,
        disabled,
        orientation,
        name,
      }),
      [value, handleValueChange, disabled, orientation, name],
    );

    const baseClasses =
      orientation === 'horizontal' ? radioGroupHorizontalClasses : radioGroupVerticalClasses;

    return (
      <RadioGroupContext.Provider value={contextValue}>
        <div
          ref={containerRef}
          role="radiogroup"
          aria-orientation={orientation}
          className={classy(baseClasses, className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);

RadioGroup.displayName = 'RadioGroup';

// ==================== RadioGroupItem ====================

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, className, children, disabled: itemDisabled, ...props }, ref) => {
    const {
      value: selectedValue,
      onValueChange,
      disabled: groupDisabled,
      name,
    } = useRadioGroupContext();

    const isChecked = value === selectedValue;
    const isDisabled = groupDisabled || itemDisabled;

    const handleClick = React.useCallback(() => {
      if (!isDisabled) {
        onValueChange(value);
      }
    }, [isDisabled, onValueChange, value]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        // Space and Enter select the radio
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!isDisabled) {
            onValueChange(value);
          }
        }
      },
      [isDisabled, onValueChange, value],
    );

    // Base styles

    return (
      // biome-ignore lint/a11y/useSemanticElements: Custom radio with visual styling not possible with native input
      <button
        type="button"
        ref={ref}
        role="radio"
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        disabled={isDisabled}
        name={name}
        className={classy(radioGroupItemBaseClasses, className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {isChecked && <span className={radioGroupItemIndicatorClasses} aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

RadioGroupItem.displayName = 'RadioGroupItem';

// ==================== Exports ====================

export default RadioGroup;
