/**
 * Form label component with semantic variants and accessibility associations
 *
 * @cognitive-load 2/10 - Provides clarity and reduces interpretation effort
 * @attention-economics Information hierarchy: field=required label, hint=helpful guidance, error=attention needed
 * @trust-building Clear requirement indication, helpful hints, non-punitive error messaging
 * @accessibility Form association, screen reader optimization, color-independent error indication
 * @semantic-meaning Variant meanings: field=input association, hint=guidance, error=validation feedback, success=confirmation
 *
 * @usage-patterns
 * DO: Always associate with input using htmlFor/id
 * DO: Use importance levels to guide user attention
 * DO: Provide visual and semantic marking for required fields
 * DO: Adapt styling based on form vs descriptive context
 * NEVER: Orphaned labels, unclear or ambiguous text, missing required indicators
 *
 * @example
 * ```tsx
 * // Form label with input association
 * <Label htmlFor="email">Email Address</Label>
 * <Input id="email" type="email" />
 *
 * // Required field indication
 * <Label htmlFor="name">
 *   Name <span className="text-destructive">*</span>
 * </Label>
 * ```
 */
import * as React from 'react';
import classy from '@/lib/primitives/classy';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
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

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses: Record<string, string> = {
      default: 'text-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      info: 'text-info',
      muted: 'text-muted-foreground',
      accent: 'text-accent',
    };

    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: Label component associates with controls via htmlFor prop or by wrapping
      <label
        ref={ref}
        className={classy(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Label.displayName = 'Label';
