/**
 * Shared class definitions for RadioGroup component
 */

export const radioGroupHorizontalClasses = 'flex gap-2';

export const radioGroupVerticalClasses = 'grid gap-2';

export const radioGroupItemBaseClasses =
  'inline-flex items-center justify-center ' +
  'aspect-square h-4 w-4 ' +
  'rounded-full ' +
  'border border-primary ' +
  'text-primary ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const radioGroupItemIndicatorClasses = 'block h-2 w-2 rounded-full bg-current';
