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
  'hover:border-input-hover ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const radioGroupItemIndicatorClasses = 'block h-2 w-2 rounded-full bg-current';

// State-driven indicator visibility: the controller toggles data-state=checked|unchecked
// on each item button (marked `group`), so the dot shows only when checked - no
// conditional rendering. The compound `group-data-[state=unchecked]` selector outranks
// the indicator's own `block`, so the dot hides reliably when unchecked. The web
// component renders the dot only when checked and is intentionally left untouched.
export const radioGroupItemGroupClass = 'group';

export const radioGroupItemIndicatorStateClasses = 'group-data-[state=unchecked]:hidden';
