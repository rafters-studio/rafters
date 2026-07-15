/**
 * Inline status banner for important user feedback. Announces itself to
 * assistive tech the moment it appears -- no dismissal, no timer, no
 * decision. Compose Alert with AlertTitle and AlertDescription; AlertAction
 * is an optional trailing slot for a single dismiss/undo control.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Severity hierarchy: destructive/warning demand immediate
 * attention, success confirms, default/info/muted/accent are supplementary.
 * Never stack multiple alerts -- surface the single most important one.
 * @trust-building Plain, honest feedback over alarming language; the severity
 * variant must match the message's actual stakes (never dress a minor notice
 * as destructive, never soften a real error to default).
 * @accessibility role="alert" is an assertive live region -- it announces on
 * mount with no user action required, so reserve it for feedback that needs
 * immediate notice. Severity is never color-only: pair the variant with an
 * icon or the text itself carrying the meaning.
 */
import * as React from 'react';
import { useBehavior } from '../../hooks/use-behavior';
import classy from '../../primitives/classy';
import { alert, type AlertConfig, type AlertVariant } from './alert.behavior';
import {
  alertActionClasses,
  alertClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from './alert.classes';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, className, ...props }, ref) => {
    const config: AlertConfig = { variant };
    const { ids, aria } = useBehavior(alert, config);
    const classes = alertClasses(config, {});

    // No effects and no optional parts -- nothing ever calls getPart, so
    // there is nothing for setPart's presence tracking to do (button's
    // root follows the same plain-ref shape for the same reason).
    return (
      <div
        ref={ref}
        data-part="root"
        id={ids.root}
        className={classy(classes.root, className)}
        {...aria.root}
        {...props}
      />
    );
  },
);

Alert.displayName = 'Alert';

export type AlertTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

/** Renders a raw h5 because Typography's H5 does not exist yet in the new
 *  tree (matrix: typography, pending); the tag matches the shadcn surface. */
export const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={classy(alertTitleClasses, className)} {...props} />
  ),
);

AlertTitle.displayName = 'AlertTitle';

export type AlertDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

export const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={classy(alertDescriptionClasses, className)} {...props} />
  ),
);

AlertDescription.displayName = 'AlertDescription';

export type AlertActionProps = React.HTMLAttributes<HTMLDivElement>;

/** Trailing slot for a single dismiss/undo control -- oracle contract.
 *  Plain composition, like Title and Description: the behavior declares
 *  exactly one part (root), so this carries no data-part marker -- a
 *  binding rendering an undeclared part is structure the score never
 *  authorized (boundary 5). */
export const AlertAction = React.forwardRef<HTMLDivElement, AlertActionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={classy(alertActionClasses, className)} {...props} />
  ),
);

AlertAction.displayName = 'AlertAction';

export default Alert;
