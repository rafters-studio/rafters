/**
 * Shared class definitions for Tooltip component
 * Used by both tooltip.tsx (React) and tooltip.astro (Astro)
 */

export const tooltipTriggerClasses = 'inline-flex';

export const tooltipContentClasses =
  'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-sm text-background shadow-md transition-opacity duration-fast';
