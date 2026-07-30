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
    const classes = alertClasses(config, {});

    // A static score: role="alert" is constant, no state, no ids, no effects.
    // Config in, classes + aria out -- the card/container shape, no
    // useBehavior. The aria projection ignores ids, so pass an empty one.
    const { root: aria } = alert.aria({}, config, { root: '' });

    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(classes.root, className)}
        {...aria}
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
    <h5
      ref={ref}
      data-slot="alert-title"
      className={classy(alertTitleClasses, className)}
      {...props}
    />
  ),
);

AlertTitle.displayName = 'AlertTitle';

export type AlertDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

export const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-description"
      className={classy(alertDescriptionClasses, className)}
      {...props}
    />
  ),
);

AlertDescription.displayName = 'AlertDescription';

export type AlertActionProps = React.HTMLAttributes<HTMLDivElement>;

/** Trailing slot for a single dismiss/undo control -- oracle contract.
 *  Plain composition, like Title and Description: the behavior declares
 *  exactly one part (root), so this carries no data-part marker -- a
 *  binding rendering an undeclared part is structure the score never
 *  authorized (boundary 5). The `data-slot` marker is not a part -- it is the
 *  name the Astro and Web Component performances give the same region, so the
 *  three surfaces are assertable against one another. */
export const AlertAction = React.forwardRef<HTMLDivElement, AlertActionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-action"
      className={classy(alertActionClasses, className)}
      {...props}
    />
  ),
);

AlertAction.displayName = 'AlertAction';

export default Alert;
