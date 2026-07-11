/**
 * AspectRatio -- the decoration. A pure layout wrapper: no config-dependent
 * branching, so this is a static class set, not a `(config, state) =>`
 * function. The `aspect-ratio` CSS property itself is data-driven (a
 * caller-supplied number) and never a class -- arbitrary-value utilities
 * are banned (container.astro's own ruling), so it rides the one narrow
 * style channel instead (Spec 03: fill never background applies to color,
 * not to this structural exception).
 *
 * Ported from the oracle (src/old/ui/aspect-ratio.classes.ts) verbatim --
 * no color/fill tokens are in play, so the bg-*-subtle/foreground contrast
 * defect class does not apply here.
 */

export const aspectRatioBaseClasses = 'relative w-full';

export const aspectRatioChildFillClasses = '[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full';
