/**
 * Shared class definitions for Field component
 *
 * Imported by field.tsx (React) to ensure visual parity with the Web Component
 * target at field.styles.ts. Field is a layout-composition wrapper: container
 * stacks label + control + helper/error with consistent spacing; the helper
 * and error variants share the small label type ramp but flip color.
 */

export const fieldContainerClasses = 'flex flex-col gap-2';

export const fieldLabelDisabledClasses = 'opacity-50';

export const fieldRequiredMarkerClasses = 'text-destructive ml-1';

export const fieldDescriptionClasses = 'text-sm text-muted-foreground';

export const fieldErrorClasses = 'text-sm text-destructive';
