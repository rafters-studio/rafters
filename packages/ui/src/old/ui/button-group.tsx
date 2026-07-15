/**
 * Groups related buttons with connected styling for cohesive action sets
 *
 * @cognitive-load 2/10 - Visual grouping reduces perceived options, connected styling signals relatedness
 * @attention-economics Groups related actions to reduce visual noise. First/last position indicates primary flow direction. Use sparingly - max 3-5 buttons per group.
 * @trust-building Connected borders create visual hierarchy and reduce decision fatigue. Consistent sizing reinforces professional appearance.
 * @accessibility Uses role="group" with aria-label for screen readers. Individual buttons retain full keyboard accessibility. Focus ring spans full group context.
 * @semantic-meaning Grouping indicates related actions that share context. Horizontal for sequential steps, vertical for stacked choices.
 *
 * @usage-patterns
 * DO: Group related actions (Save/Cancel, Undo/Redo, pagination controls)
 * DO: Use size prop on group (Button must use useButtonGroupContext for inheritance)
 * DO: Keep groups small (2-5 buttons) for scannability
 * DO: Add aria-label to describe the group's purpose
 * NEVER: Mix unrelated actions in the same group
 * NEVER: Use more than 5 buttons in a group
 * NEVER: Nest button groups
 *
 * @example
 * ```tsx
 * // Horizontal group with size inheritance
 * <ButtonGroup size="sm" aria-label="Document actions">
 *   <Button variant="outline">Cancel</Button>
 *   <Button variant="default">Save</Button>
 * </ButtonGroup>
 *
 * // Vertical group for stacked options
 * <ButtonGroup orientation="vertical" aria-label="View options">
 *   <Button variant="ghost">Grid</Button>
 *   <Button variant="ghost">List</Button>
 *   <Button variant="ghost">Table</Button>
 * </ButtonGroup>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  buttonGroupBaseClasses,
  buttonGroupFocusStackingClasses,
  buttonGroupHorizontalConnectedClasses,
  buttonGroupOrientationClasses,
  buttonGroupVerticalConnectedClasses,
} from './button-group.classes';

// ==================== Context ====================

export type ButtonGroupSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonGroupContextValue {
  size: ButtonGroupSize;
  orientation: 'horizontal' | 'vertical';
}

const ButtonGroupContext = React.createContext<ButtonGroupContextValue | null>(null);

/**
 * Hook to access button group context from child buttons
 * Returns null if not within a ButtonGroup, allowing buttons to work standalone
 */
export function useButtonGroupContext(): ButtonGroupContextValue | null {
  return React.useContext(ButtonGroupContext);
}

// ==================== ButtonGroup ====================

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size to apply to all child buttons */
  size?: ButtonGroupSize;
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible label describing the group's purpose */
  'aria-label'?: string;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ size = 'default', orientation = 'horizontal', className, children, ...props }, ref) => {
    const contextValue = React.useMemo(
      () => ({
        size,
        orientation,
      }),
      [size, orientation],
    );

    // Base classes (non-arbitrary, safe for classy)
    const baseClasses = classy(
      buttonGroupBaseClasses,
      buttonGroupOrientationClasses[orientation],
      className,
    );

    // Combine all classes (using shared class definitions for connected styling)
    const groupClasses = [
      baseClasses,
      orientation === 'horizontal'
        ? buttonGroupHorizontalConnectedClasses
        : buttonGroupVerticalConnectedClasses,
      buttonGroupFocusStackingClasses,
    ].join(' ');

    return (
      <ButtonGroupContext.Provider value={contextValue}>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for button groups per WAI-ARIA APG */}
        <div
          ref={ref}
          role="group"
          data-orientation={orientation}
          className={groupClasses}
          {...props}
        >
          {children}
        </div>
      </ButtonGroupContext.Provider>
    );
  },
);

ButtonGroup.displayName = 'ButtonGroup';

export default ButtonGroup;
