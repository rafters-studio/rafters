/**
 * Multi-line text input component for longer form content
 *
 * @cognitive-load 4/10 - Extended input requires sustained attention for composition
 * @attention-economics Expands to accommodate content, focus state indicates active editing
 * @trust-building Auto-resize feedback, character count guidance, draft persistence patterns
 * @accessibility Screen reader labels, keyboard navigation, proper focus states
 * @semantic-meaning Extended text input: comments, descriptions, messages, notes
 *
 * @usage-patterns
 * DO: Always pair with descriptive Label component
 * DO: Provide placeholder text showing expected content format
 * DO: Use appropriate min/max heights for expected content length
 * DO: Consider character limits with visible counter
 * NEVER: Use for single-line input, use without associated label
 *
 * @example
 * ```tsx
 * <Label htmlFor="message">Message</Label>
 * <Textarea id="message" placeholder="Type your message here..." />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  textareaBaseClasses,
  textareaSizeClasses,
  textareaVariantClasses,
} from './textarea.classes';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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

// Re-export variant and size classes from shared file
const variantClasses = textareaVariantClasses;
const sizeClasses = textareaSizeClasses;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, variant = 'default', size = 'default', ...props }, ref) => {
    const cls = classy(
      textareaBaseClasses,
      variantClasses[variant] ?? variantClasses.default,
      sizeClasses[size] ?? sizeClasses.default,
      className,
    );

    return (
      <textarea
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

Textarea.displayName = 'Textarea';

export default Textarea;
