/**
 * Shared class definitions for Item component
 * Used by both item.tsx (React) and item.astro (Astro)
 */

export const itemBaseClasses =
  'flex items-center gap-3 rounded-md cursor-default select-none outline-none';

export const itemSizeClasses: Record<string, string> = {
  default: 'px-3 py-2 text-sm',
  sm: 'px-2 py-1.5 text-xs',
  lg: 'px-4 py-3 text-base',
};

export const itemFocusClasses =
  'focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export const itemMotionClasses = 'transition-colors duration-150 motion-reduce:transition-none';

export const itemIconClasses = 'shrink-0 text-current';

export const itemContentClasses = 'flex min-w-0 flex-1 flex-col';

export const itemLabelClasses = 'truncate';

export const itemDescriptionClasses = 'truncate text-muted-foreground text-xs mt-0.5';
