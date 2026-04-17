/**
 * Shared aspect-ratio class definitions
 *
 * Imported by aspect-ratio.tsx (React) and any future aspect-ratio.astro
 * target to ensure visual parity across framework targets.
 *
 * These classes cover the outer wrapper only. The `aspect-ratio` CSS
 * property itself is applied inline via the React `style` prop because
 * the value is data-driven and not a fixed token. The Web Component
 * target (aspect-ratio.element.ts) encodes the ratio into its per-instance
 * stylesheet instead of an inline style so shadow-DOM consumers keep a
 * style-attribute-free surface.
 */

export const aspectRatioBaseClasses = 'relative w-full';

export const aspectRatioChildFillClasses = '[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full';
