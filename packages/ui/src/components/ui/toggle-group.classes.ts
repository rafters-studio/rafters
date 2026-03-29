/**
 * Shared toggle group class definitions
 *
 * Imported by toggle-group.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const toggleGroupClasses = 'inline-flex items-center justify-center gap-1 rounded-lg';

export const toggleGroupDefaultVariantClasses = 'bg-muted p-1';

export const toggleGroupItemBaseClasses =
  'inline-flex items-center justify-center ' +
  'rounded-md ' +
  'text-sm font-medium ' +
  'transition-all duration-200 motion-reduce:transition-none ' +
  'active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'hover:bg-muted hover:text-muted-foreground';

export const toggleGroupItemSizeClasses: Record<string, string> = {
  default: 'h-9 px-3',
  sm: 'h-8 px-2',
  lg: 'h-10 px-4',
};

export const toggleGroupItemOutlineClasses = 'border border-input bg-transparent';

export const toggleGroupItemOutlinePressedClasses = 'bg-accent text-accent-foreground';

export const toggleGroupItemDefaultClasses = 'bg-transparent';

export const toggleGroupItemDefaultPressedClasses = 'bg-background text-foreground shadow-sm';
