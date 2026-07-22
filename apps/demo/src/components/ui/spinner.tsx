/**
 * Spinner -- a busy indicator for active, indeterminate operations. It signals
 * that work is in flight without measuring progress; for a known-length
 * operation use Progress, for content placeholders use Skeleton.
 *
 * A pure static score has nothing to subscribe to: this performance is pure
 * decoration application plus the projected accessible name. No useBehavior,
 * no memory, no bind -- config in, classes and aria out.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Activity feedback: a spinner tells the user the system
 * is working and to wait. Brief, low-stakes attention capture -- it holds
 * confidence during a pause, it does not compete with content. Pair it with
 * text for operations long enough that a bare spinner reads as a stall.
 * @trust-building Immediate, honest feedback that an action is processing --
 * it prevents the double-submission anxiety of a dead-looking control. Size it
 * to context (sm inside a button, lg for a page-level wait) so the indicator
 * matches the stakes of the wait.
 * @accessibility The `<output>` carries an implicit `role="status"` polite
 * live region; the score projects `aria-label="Loading"` as its single
 * accessible name (the redundant sr-only span the oracle paired with the
 * label is dropped, the same simplification dialog and progress made).
 * `motion-reduce:animate-none` honours `prefers-reduced-motion` -- the ring
 * stops spinning, the semantics stay.
 * @semantic-meaning Processing state: indeterminate loading for actions
 * without a measurable progress value.
 *
 * @example
 * ```tsx
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
