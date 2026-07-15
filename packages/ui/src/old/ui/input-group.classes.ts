/**
 * Shared input-group and input-group-addon class definitions.
 *
 * Imported by input-group.tsx (React) to mirror the semantic structure
 * consumed by the Astro and Web Component targets. All three targets share
 * the same size, addon position and addon variant vocabulary.
 */

export type InputGroupSize = 'sm' | 'default' | 'lg';
export type InputGroupAddonPosition = 'start' | 'end';
export type InputGroupAddonVariant = 'default' | 'filled';

export const inputGroupSizeClasses: Record<InputGroupSize, string> = {
  sm: 'h-9 text-sm',
  default: 'h-10',
  lg: 'h-11',
};

export const inputGroupBaseClasses =
  'flex items-center w-full rounded-md border border-input bg-background ' +
  'ring-offset-background ' +
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2';

export const inputGroupDisabledClasses = 'opacity-50 cursor-not-allowed';

export const inputGroupAddonBaseClasses =
  'flex items-center justify-center shrink-0 text-muted-foreground px-3';

export const inputGroupAddonPositionClasses: Record<InputGroupAddonPosition, string> = {
  start: 'border-r border-input',
  end: 'border-l border-input',
};

export const inputGroupAddonVariantClasses: Record<InputGroupAddonVariant, string> = {
  default: 'bg-transparent',
  filled: 'bg-muted',
};
