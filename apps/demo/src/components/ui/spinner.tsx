/**
 * Spinning loading indicator for active operations
 *
 * @cognitive-load 2/10 - Simple activity indicator, brief attention capture
 * @attention-economics Activity feedback: indicates system is working, maintains user confidence
 * @trust-building Immediate feedback that action is processing, prevents double-submission anxiety
 * @accessibility aria-label for screen readers, motion-reduce respects preferences, sr-only text
 * @semantic-meaning Processing state: indeterminate loading for actions without progress measurement
 *
 * @usage-patterns
 * DO: Use for button loading states
 * DO: Use for inline loading indicators
 * DO: Size appropriately for context (sm for buttons, lg for page loading)
 * DO: Combine with text feedback for longer operations
 * NEVER: Use for content loading (use Skeleton instead), use without accessible label
 *
 * @example
 * ```tsx
 * // Button loading state
 * <Button disabled>
 *   <Spinner size="sm" />
 *   Saving...
 * </Button>
 * ```
 */
import * as React from 'react';
import classy from '@/lib/primitives/classy';
import {
  spinner,
  type SpinnerConfig,
  type SpinnerSize,
  type SpinnerVariant,
} from '@/components/ui/spinner.behavior';
import { spinnerClasses } from '@/components/ui/spinner.classes';

export interface SpinnerProps extends React.HTMLAttributes<HTMLOutputElement> {
  /** Size variant: sm for inline controls, default, lg for page-level waits. */
  size?: SpinnerSize;
  /** Colour variant over the role vocabulary. */
  variant?: SpinnerVariant;
}

export const Spinner = React.forwardRef<HTMLOutputElement, SpinnerProps>(
  ({ size, variant, className, ...props }, ref) => {
    const config: SpinnerConfig = { size, variant };
    const classes = spinnerClasses(config, {});

    // A static score: aria-label is constant, no state, no ids, no effects.
    // Config in, classes + aria out -- the alert/card shape, no useBehavior.
    // The aria projection ignores ids, so pass an empty one.
    const { root: aria } = spinner.aria({}, config, { root: '' });

    return (
      <output
        ref={ref}
        data-part="root"
        className={classy(classes.root, className)}
        {...aria}
        {...props}
      />
    );
  },
);

Spinner.displayName = 'Spinner';

export default Spinner;
