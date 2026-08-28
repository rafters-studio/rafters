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
import classy from '@/lib/primitives/classy';
import type { ButtonSize } from '@/components/ui/button.behavior';
import {
  buttonGroup,
  type ButtonGroupConfig,
  type ButtonGroupOrientation,
} from '@/components/ui/button-group.behavior';
import { buttonGroupClasses } from '@/components/ui/button-group.classes';

export type { ButtonGroupOrientation };

// ==================== Size-inheritance context (React-only affordance) ====================

interface ButtonGroupContextValue {
  size: ButtonSize;
  orientation: ButtonGroupOrientation;
}

const ButtonGroupContext = React.createContext<ButtonGroupContextValue | null>(null);

/**
 * Read the enclosing ButtonGroup's size and orientation from a child Button.
 * Returns null outside a group, so a Button works standalone. This is the
 * React seam for size inheritance -- a framework affordance the score cannot
 * express (context does not cross to the WC/Astro slotted light DOM). The
 * ported Button does not yet consume it (see the oracle-disposition table in
 * the component doc); wiring Button to read it is a separate, out-of-scope
 * change to a different component.
 */
export function useButtonGroupContext(): ButtonGroupContextValue | null {
  return React.useContext(ButtonGroupContext);
}

// ==================== ButtonGroup ====================

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size published to child Buttons via context (they read useButtonGroupContext). */
  size?: ButtonSize;
  /** Layout direction of the adjoined set. */
  orientation?: ButtonGroupOrientation;
  /** Accessible label describing the group's purpose. */
  'aria-label'?: string;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ size = 'default', orientation = 'horizontal', className, children, ...props }, ref) => {
    const config: ButtonGroupConfig = { orientation };
    const classes = buttonGroupClasses(config, {});

    // A static score: role="group" is constant, no state, no ids, no effects.
    // Config in, classes + aria out -- the alert/container shape, no
    // useBehavior. The aria projection ignores ids, so pass an empty one.
    const { root: aria } = buttonGroup.aria({}, config, { root: '' });

    // Size inheritance is a React-only concern; it never touches the score.
    const contextValue = React.useMemo<ButtonGroupContextValue>(
      () => ({ size, orientation }),
      [size, orientation],
    );

    return (
      <ButtonGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-part="root"
          data-orientation={orientation}
          className={classy(classes.root, className)}
          {...aria}
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
