/**
 * Shared image size and alignment class definitions
 *
 * Parallel to badge.classes.ts and button.classes.ts. Captures the Tailwind
 * class mapping for the image size + alignment matrix so every framework
 * target (React, Astro, WC) renders visually identical output.
 *
 * The React target at image.tsx currently spells these classes inline; this
 * module pulls them out so image.astro and image.styles.ts can mirror the
 * same decisions without duplication.
 */

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export type ImageAlignment = 'left' | 'center' | 'right';

/** Size preset to Tailwind max-width class mapping. */
export const imageSizeClasses: Record<ImageSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'w-full',
};

/** Horizontal alignment class mapping. */
export const imageAlignmentClasses: Record<ImageAlignment, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
};

/** Base classes always applied to the figure wrapper. */
export const imageBaseClasses = 'relative';

/** Classes applied to the inner image element. */
export const imageImgClasses = 'block w-full h-auto';

/** Classes applied to the optional caption. */
export const imageCaptionClasses = 'mt-2 text-center text-sm text-muted-foreground';
