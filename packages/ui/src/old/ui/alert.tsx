/**
 * Status message component for important user feedback
 *
 * @cognitive-load 3/10 - Simple message display with clear visual hierarchy
 * @attention-economics Variant hierarchy: destructive=immediate attention, warning=caution, success=confirmation, info=supplementary
 * @trust-building Clear, honest feedback builds confidence; destructive alerts require careful wording
 * @accessibility role="alert" for urgent messages; role="status" for informational; never color-only
 * @semantic-meaning Variant mapping: default=neutral, info=helpful context, success=positive confirmation, warning=proceed with caution, destructive=error or danger
 *
 * @usage-patterns
 * DO: Use destructive for errors that need user action
 * DO: Use success to confirm completed actions
 * DO: Use warning for potential issues before they happen
 * DO: Include icons to reinforce meaning beyond color
 * NEVER: Use alerts for transient feedback (use contextual feedback instead)
 * NEVER: Stack multiple alerts - prioritize the most important
 * NEVER: Use destructive for warnings or warnings for info
 *
 * @example
 * ```tsx
 * // Error alert
 * <Alert variant="destructive">
 *   <AlertCircle className="h-4 w-4" />
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>
 *     Your session has expired. Please log in again.
 *   </AlertDescription>
 * </Alert>
 *
 * // Success alert
 * <Alert variant="success">
 *   <CheckCircle className="h-4 w-4" />
 *   <AlertTitle>Success</AlertTitle>
 *   <AlertDescription>
 *     Your changes have been saved.
 *   </AlertDescription>
 * </Alert>
 *
 * // Informational alert
 * <Alert variant="info">
 *   <Info className="h-4 w-4" />
 *   <AlertTitle>Note</AlertTitle>
 *   <AlertDescription>
 *     This feature is in beta.
 *   </AlertDescription>
 * </Alert>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'muted'
    | 'accent';
}

import {
  alertActionClasses,
  alertBaseClasses,
  alertDescriptionClasses,
  alertTitleClasses,
  alertVariantClasses,
} from './alert.classes';

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={classy(alertBaseClasses, alertVariantClasses[variant] ?? '', className)}
        {...props}
      />
    );
  },
);

Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={classy(alertTitleClasses, className)} {...props} />
));

AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={classy(alertDescriptionClasses, className)} {...props} />
));

AlertDescription.displayName = 'AlertDescription';

export interface AlertActionProps extends React.HTMLAttributes<HTMLDivElement> {}

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
