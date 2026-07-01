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
import {
  toggleGroupClasses,
  toggleGroupDefaultVariantClasses,
  toggleGroupItemBaseClasses,
  toggleGroupItemDefaultClasses,
  toggleGroupItemDefaultStateClasses,
  toggleGroupItemOutlineClasses,
  toggleGroupItemOutlineStateClasses,
  toggleGroupItemSizeClasses,
} from './toggle-group.classes';
import { createToggleGroup, type ToggleGroupController } from './toggle-group.controller';

// ==================== Context ====================

// Context carries only group-level presentation (variant, size, disabled). Selection
// state and keyboard behavior live in the controller, so no value/dispatch is threaded.
interface ToggleGroupContextValue {
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
  const isControlled = controlledValue !== undefined;

  // Capture the initial pressed value once; the controller owns state thereafter.
  const initialRef = React.useRef(isControlled ? controlledValue : defaultValue);
  // Keep the latest onValueChange reachable without re-mounting the controller.
  const onChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onChangeRef.current = onValueChange;
  });

  const controllerRef = React.useRef<ToggleGroupController | null>(null);

  // Mount the controller via a callback ref: runs during commit (before paint), so
  // initial selection is reflected with no flash, and React renders no
  // selection-derived attributes, so re-renders cannot clobber the controller.
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const initial = initialRef.current;
      const controller = createToggleGroup(node, {
        type,
        orientation,
        onChange: (value) => onChangeRef.current?.(value),
        ...(initial === undefined ? {} : { initial }),
      });
      controllerRef.current = controller;
      return () => {
        controller.destroy();
        controllerRef.current = null;
      };
    },
    [type, orientation],
  );

  // Controlled mode: mirror the prop into the controller.
  React.useEffect(() => {
    if (isControlled && controlledValue !== undefined) {
      controllerRef.current?.setValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const contextValue = React.useMemo(
    () => ({ variant, size, disabled }),
    [variant, size, disabled],
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
        ref={setRoot}
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
  ...props
}: ToggleGroupItemProps) {
  const { variant, size, disabled: groupDisabled } = useToggleGroupContext();

  const disabled = groupDisabled || itemDisabled;

  // Pressed styling is data-state driven (the controller toggles data-state=on|off),
  // so the class string is the same regardless of selection - no conditional application.
  const variantClasses =
    variant === 'outline'
      ? classy(toggleGroupItemOutlineClasses, toggleGroupItemOutlineStateClasses)
      : classy(toggleGroupItemDefaultClasses, toggleGroupItemDefaultStateClasses);

  const itemClasses = classy(
    toggleGroupItemBaseClasses,
    toggleGroupItemSizeClasses[size] ?? toggleGroupItemSizeClasses.default,
    variantClasses,
    className,
  );

  // No aria-pressed / data-state / onClick here: the controller reflects pressed state
  // and handles toggling (click delegation + roving focus) on the root.
  return (
    <button
      type="button"
      data-roving-item
      data-value={value}
      disabled={disabled}
      className={itemClasses}
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
