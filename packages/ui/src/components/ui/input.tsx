/**
 * Form input component with validation states and accessibility
 *
 * @cognitive-load 4/10 - Data entry with validation feedback requires user attention
 * @attention-economics State hierarchy: default=ready, focus=active input, error=requires attention, success=validation passed
 * @trust-building Clear validation feedback, error recovery patterns, progressive enhancement
 * @accessibility Screen reader labels, validation announcements, keyboard navigation, high contrast support
 * @semantic-meaning Type-appropriate validation: email=format validation, password=security indicators, number=range constraints
 *
 * @usage-patterns
 * DO: Always pair with descriptive Label component
 * DO: Use helpful placeholders showing format examples
 * DO: Provide real-time validation for user confidence
 * DO: Use appropriate input types for sensitive data
 * NEVER: Label-less inputs, validation only on submit, unclear error messages
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" placeholder="you@example.com" />
 *
 * // Error state
 * <Input variant="error" placeholder="Invalid input" />
 *
 * // Success state
 * <Input variant="success" defaultValue="Valid input" />
 *
 * // Sizes
 * <Input size="sm" placeholder="Small" />
 * <Input size="lg" placeholder="Large" />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { inputBaseClasses, inputSizeClasses, inputVariantClasses } from './input.classes';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
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
  size?: 'sm' | 'default' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', variant = 'default', size = 'default', disabled, ...props },
    ref,
  ) => {
    const cls = classy(
      inputBaseClasses,
      inputVariantClasses[variant] ?? inputVariantClasses.default,
      inputSizeClasses[size] ?? inputSizeClasses.default,
      className,
    );

    return (
      <input
        type={type}
        className={cls}
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled ? 'true' : undefined}
        aria-invalid={variant === 'destructive' ? 'true' : undefined}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export default Input;
