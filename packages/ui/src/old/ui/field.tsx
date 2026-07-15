/**
 * Form field wrapper that composes Label, input slot, and helper text
 *
 * @cognitive-load 3/10 - Familiar form pattern with clear visual hierarchy
 * @attention-economics Information hierarchy: label=field identity, input=action area, description=guidance, error=requires attention
 * @trust-building Clear labeling reduces uncertainty, helpful descriptions guide input, non-punitive error messaging
 * @accessibility Automatic label-input association via htmlFor/id, aria-describedby for helper text, error announcements
 * @semantic-meaning Field states: default=ready, error=validation failed, disabled=unavailable
 *
 * @usage-patterns
 * DO: Always provide a label for form fields
 * DO: Use description for format hints or requirements
 * DO: Use error state with clear, actionable messages
 * DO: Generate consistent IDs for accessibility associations
 * NEVER: Leave inputs without associated labels
 * NEVER: Use error styling without error messages
 * NEVER: Stack multiple Field components without spacing
 *
 * @example
 * ```tsx
 * // Basic field with description
 * <Field label="Email" description="We'll never share your email">
 *   <Input type="email" />
 * </Field>
 *
 * // Field with error state
 * <Field label="Password" error="Password must be at least 8 characters">
 *   <Input type="password" />
 * </Field>
 *
 * // Required field
 * <Field label="Username" required>
 *   <Input />
 * </Field>
 *
 * // With custom ID
 * <Field label="Name" id="user-name">
 *   <Input />
 * </Field>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  fieldContainerClasses,
  fieldDescriptionClasses,
  fieldErrorClasses,
  fieldLabelDisabledClasses,
  fieldRequiredMarkerClasses,
} from './field.classes';
import { Label } from './label';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label text */
  label: React.ReactNode;
  /** Optional description/hint text shown below input */
  description?: React.ReactNode;
  /** Error message - when provided, field enters error state */
  error?: React.ReactNode;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom ID for the field - used to connect label, input, and descriptions */
  id?: string;
  /** The form control (Input, Select, Textarea, etc.) */
  children: React.ReactNode;
}

function useFieldId(providedId?: string): string {
  const reactId = React.useId();
  return providedId ?? `field-${reactId}`;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  (
    {
      className,
      label,
      description,
      error,
      required,
      disabled,
      id: providedId,
      children,
      ...props
    },
    ref,
  ) => {
    const fieldId = useFieldId(providedId);
    const inputId = fieldId;
    const descriptionId = description ? `${fieldId}-description` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    // Determine aria-describedby value
    const ariaDescribedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined;

    // Clone child to inject accessibility props
    const enhancedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      // Type assertion for element props
      const childProps = child.props as Record<string, unknown>;

      return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        id: (childProps.id as string | undefined) ?? inputId,
        'aria-describedby':
          (childProps['aria-describedby'] as string | undefined) ?? ariaDescribedBy,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        disabled: (childProps.disabled as boolean | undefined) ?? disabled,
      });
    });

    const cls = classy(fieldContainerClasses, className);

    return (
      <div ref={ref} className={cls} {...props}>
        <Label htmlFor={inputId} className={disabled ? fieldLabelDisabledClasses : undefined}>
          {label}
          {required && (
            <span className={fieldRequiredMarkerClasses} aria-hidden="true">
              *
            </span>
          )}
        </Label>

        {enhancedChildren}

        {description && !error && (
          <p id={descriptionId} className={fieldDescriptionClasses}>
            {description}
          </p>
        )}

        {error && (
          <p id={errorId} className={fieldErrorClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Field.displayName = 'Field';

export default Field;
