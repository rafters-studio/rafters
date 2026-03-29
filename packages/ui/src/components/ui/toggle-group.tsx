/**
 * Toggle group component for grouped toggle selections
 *
 * @cognitive-load 3/10 - Multiple options with clear selection state
 * @attention-economics Option group: all options visible, selected state prominent
 * @trust-building Immediate visual feedback, clear selection state, reversible
 * @accessibility Roving focus for keyboard navigation, proper ARIA pressed states
 * @semantic-meaning Selection modes: single=mutually exclusive (like radio), multiple=independent (like checkboxes)
 *
 * @usage-patterns
 * DO: Use single mode for mutually exclusive view/format options
 * DO: Use multiple mode for independent feature toggles
 * DO: Keep options visually grouped and styled consistently
 * DO: Limit to 2-5 options for scannability
 * NEVER: More than 7 options, complex nested selections
 *
 * @example
 * ```tsx
 * // Single selection (view mode)
 * <ToggleGroup type="single" defaultValue="grid">
 *   <ToggleGroup.Item value="grid"><Grid /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="list"><List /></ToggleGroup.Item>
 * </ToggleGroup>
 *
 * // Multiple selection (text formatting)
 * <ToggleGroup type="multiple">
 *   <ToggleGroup.Item value="bold"><Bold /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="italic"><Italic /></ToggleGroup.Item>
 * </ToggleGroup>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  toggleGroupClasses,
  toggleGroupDefaultVariantClasses,
  toggleGroupItemBaseClasses,
  toggleGroupItemDefaultClasses,
  toggleGroupItemDefaultPressedClasses,
  toggleGroupItemOutlineClasses,
  toggleGroupItemOutlinePressedClasses,
  toggleGroupItemSizeClasses,
} from './toggle-group.classes';

// ==================== Context ====================

interface ToggleGroupContextValue {
  type: 'single' | 'multiple';
  value: string | string[];
  onItemToggle: (itemValue: string) => void;
  variant: 'default' | 'outline';
  size: 'default' | 'sm' | 'lg';
  disabled: boolean;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error('ToggleGroupItem must be used within ToggleGroup');
  }
  return context;
}

// ==================== ToggleGroup ====================

export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Selection mode: single allows one selection, multiple allows any number */
  type: 'single' | 'multiple';
  /** Controlled value - string for single, string[] for multiple */
  value?: string | string[];
  /** Default value for uncontrolled usage */
  defaultValue?: string | string[];
  /** Callback when selection changes */
  onValueChange?: (value: string | string[]) => void;
  /** Visual variant */
  variant?: 'default' | 'outline';
  /** Size variant */
  size?: 'default' | 'sm' | 'lg';
  /** Whether all items are disabled */
  disabled?: boolean;
  /** Orientation for keyboard navigation */
  orientation?: 'horizontal' | 'vertical';
}

export function ToggleGroup({
  type,
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = 'default',
  size = 'default',
  disabled = false,
  orientation = 'horizontal',
  className,
  children,
  ...props
}: ToggleGroupProps) {
  // Derive initial value based on type
  const getInitialValue = (): string | string[] => {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return type === 'single' ? '' : [];
  };

  // State management (controlled vs uncontrolled)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(getInitialValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const groupRef = React.useRef<HTMLDivElement>(null);

  // Set up roving focus
  React.useEffect(() => {
    const container = groupRef.current;
    if (!container) return;

    const cleanup = createRovingFocus(container, {
      orientation: orientation === 'vertical' ? 'vertical' : 'horizontal',
      loop: true,
    });

    return cleanup;
  }, [orientation]);

  const handleItemToggle = React.useCallback(
    (itemValue: string) => {
      let newValue: string | string[];

      if (type === 'single') {
        // In single mode, clicking selected item deselects it
        newValue = value === itemValue ? '' : itemValue;
      } else {
        // In multiple mode, toggle the item in the array
        const currentArray = Array.isArray(value) ? value : [];
        if (currentArray.includes(itemValue)) {
          newValue = currentArray.filter((v) => v !== itemValue);
        } else {
          newValue = [...currentArray, itemValue];
        }
      }

      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [type, value, isControlled, onValueChange],
  );

  const contextValue = React.useMemo(
    () => ({
      type,
      value,
      onItemToggle: handleItemToggle,
      variant,
      size,
      disabled,
    }),
    [type, value, handleItemToggle, variant, size, disabled],
  );

  // Group styling
  const groupClasses = classy(
    toggleGroupClasses,
    variant === 'default' && toggleGroupDefaultVariantClasses,
    className,
  );

  return (
    <ToggleGroupContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for toggle groups per WAI-ARIA APG, fieldset is for form elements */}
      <div
        ref={groupRef}
        role="group"
        data-orientation={orientation}
        className={groupClasses}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

ToggleGroup.displayName = 'ToggleGroup';

// ==================== ToggleGroupItem ====================

export interface ToggleGroupItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Value that identifies this item */
  value: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export function ToggleGroupItem({
  value,
  disabled: itemDisabled,
  className,
  children,
  onClick,
  ...props
}: ToggleGroupItemProps) {
  const {
    type,
    value: groupValue,
    onItemToggle,
    variant,
    size,
    disabled: groupDisabled,
  } = useToggleGroupContext();

  const disabled = groupDisabled || itemDisabled;

  // Determine if this item is pressed
  const isPressed = React.useMemo(() => {
    if (type === 'single') {
      return groupValue === value;
    }
    return Array.isArray(groupValue) && groupValue.includes(value);
  }, [type, groupValue, value]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        onItemToggle(value);
      }
      onClick?.(event);
    },
    [disabled, onItemToggle, value, onClick],
  );

  // Build variant-specific classes
  const getVariantClasses = () => {
    if (variant === 'outline') {
      return classy(
        toggleGroupItemOutlineClasses,
        isPressed && toggleGroupItemOutlinePressedClasses,
      );
    }
    // default variant
    return classy(toggleGroupItemDefaultClasses, isPressed && toggleGroupItemDefaultPressedClasses);
  };

  const itemClasses = classy(
    toggleGroupItemBaseClasses,
    // Size
    toggleGroupItemSizeClasses[size] ?? toggleGroupItemSizeClasses.default,
    // Variant
    getVariantClasses(),
    className,
  );

  return (
    <button
      type="button"
      aria-pressed={isPressed}
      data-state={isPressed ? 'on' : 'off'}
      data-roving-item
      disabled={disabled}
      className={itemClasses}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

ToggleGroupItem.displayName = 'ToggleGroupItem';

// ==================== Namespaced Export ====================

ToggleGroup.Item = ToggleGroupItem;

export default ToggleGroup;
