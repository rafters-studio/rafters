/**
 * Shared separator orientation class definitions
 *
 * Imported by both separator.tsx (React) and separator.astro (Astro)
 * to ensure visual parity across framework targets.
 */

export const separatorOrientationClasses: Record<string, string> = {
  horizontal: 'h-px w-full',
  vertical: 'h-full w-px',
};

export const separatorBaseClasses = 'shrink-0 bg-border';
