/**
 * Adjoins a set of related buttons into one cohesive action set: shared,
 * collapsed borders and a single focus ring that stacks above its neighbors.
 * A layout composition -- it arranges whatever buttons the consumer projects
 * but renders no button itself, holds no state, and is not form-associated.
 *
 * @cognitive-load 2/10 - decision 0, information 1, interaction 0, disruption
 * 0, learning 1. The group makes no decision and has no interaction of its own;
 * connected borders add a little information (these actions are related) and the
 * grouping convention is quickly learned. The buttons inside carry their own load.
 * @attention-economics Groups related actions so they read as one unit and stop
 * competing individually for attention -- first/last position signals flow
 * direction. Keep groups small (2-5 buttons); a larger group reads as a toolbar,
 * not a decision.
 * @trust-building Collapsed borders and consistent sizing make the set look
 * deliberate rather than assembled by accident, reducing decision fatigue across
 * the shared action context.
 * @accessibility role="group" (WAI-ARIA APG) with a consumer aria-label names the
 * set for assistive tech; each child button keeps its full native keyboard
 * accessibility, and the focus-visible child stacks above its neighbors so the
 * ring is never clipped by an overlapping collapsed border.
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import type { ButtonSize } from '../button/button.behavior';
import {
  buttonGroup,
  type ButtonGroupConfig,
  type ButtonGroupOrientation,
} from './button-group.behavior';
import { buttonGroupClasses } from './button-group.classes';

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
