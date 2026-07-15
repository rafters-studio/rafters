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
import {
  radioGroupHorizontalClasses,
  radioGroupItemBaseClasses,
  radioGroupItemGroupClass,
  radioGroupItemIndicatorClasses,
  radioGroupItemIndicatorStateClasses,
  radioGroupVerticalClasses,
} from './radio-group.classes';
import { createRadioGroup, type RadioGroupController } from './radio-group.controller';

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

// Context carries only group-level presentation (disabled) and the generated radio
// `name` for native grouping. Selection state and keyboard behavior live in the
// controller, so no value/dispatch is threaded.
interface RadioGroupContextValue {
  disabled: boolean;
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
    const isControlled = controlledValue !== undefined;

    // Capture the initial selected value once; the controller owns state thereafter.
    const initialRef = React.useRef(isControlled ? controlledValue : defaultValue);
    // Keep the latest onValueChange reachable without re-mounting the controller.
    const onChangeRef = React.useRef(onValueChange);
    React.useEffect(() => {
      onChangeRef.current = onValueChange;
    });

    const controllerRef = React.useRef<RadioGroupController | null>(null);

    // Generate a stable name for native <input type="radio"> grouping. This is markup
    // identity, not selection state, so it stays in the React layer.
    const name = React.useId();

    // Mount the controller via a callback ref (also forwarding the node to `ref`):
    // runs during commit before paint, so initial selection is reflected with no flash.
    const setRoot = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        if (!node) return;
        const controller = createRadioGroup(node, {
          initial: initialRef.current,
          orientation,
          onChange: (value) => onChangeRef.current?.(value),
        });
        controllerRef.current = controller;
        return () => {
          controller.destroy();
          controllerRef.current = null;
        };
      },
      [ref, orientation],
    );

    // Controlled mode: mirror the prop into the controller.
    React.useEffect(() => {
      if (isControlled && controlledValue !== undefined) {
        controllerRef.current?.setValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    const contextValue = React.useMemo(() => ({ disabled, name }), [disabled, name]);

    const baseClasses =
      orientation === 'horizontal' ? radioGroupHorizontalClasses : radioGroupVerticalClasses;

    return (
      <RadioGroupContext.Provider value={contextValue}>
        <div
          ref={setRoot}
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
    const { disabled: groupDisabled, name } = useRadioGroupContext();

    const isDisabled = groupDisabled || itemDisabled;

    // No data-state / onClick / onKeyDown here: the controller reflects checked state
    // (and toggles the indicator via data-state CSS) and handles selection (click +
    // Space/Enter delegation + roving focus) on the root. aria-checked is rendered as a
    // constant `false` baseline only to satisfy the radio role's required ARIA prop;
    // React never re-asserts an unchanged prop, so the controller's runtime value (set
    // before paint) is not clobbered on re-render.
    return (
      // biome-ignore lint/a11y/useSemanticElements: Custom radio with visual styling not possible with native input
      <button
        type="button"
        ref={ref}
        role="radio"
        aria-checked={false}
        data-value={value}
        disabled={isDisabled}
        name={name}
        className={classy(radioGroupItemBaseClasses, radioGroupItemGroupClass, className)}
        {...props}
      >
        <span
          data-radio-indicator
          className={classy(radioGroupItemIndicatorClasses, radioGroupItemIndicatorStateClasses)}
          aria-hidden="true"
        />
        {children}
      </button>
    );
  },
);

RadioGroupItem.displayName = 'RadioGroupItem';

// ==================== Exports ====================

export default RadioGroup;
