/**
 * Shared class definitions for Avatar component
 * Used by both avatar.tsx (React) and avatar.astro (Astro)
 */

export const avatarBaseClasses = 'relative flex shrink-0 overflow-hidden rounded-full';

export const avatarSizeClasses: Record<string, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export const avatarImageClasses = 'aspect-square h-full w-full object-cover';

export const avatarFallbackClasses =
  'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground';
