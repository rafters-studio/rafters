/**
 * Embed class strings -- the view. No logic: the resolver (embed.behavior.ts)
 * decides iframe vs fallback; these literals decorate whichever branch renders.
 * Every class is a token/semantic utility (bg-muted, text-label-small ts-label-small,
 * text-primary), never a raw colour or spacing value. Shared verbatim across
 * the React, Web Component, and Astro performances so visual parity holds.
 */

/**
 * Outer container wrapping the iframe: a rounded, clipped muted surface. The
 * aspect ratio is data-driven and applied as an inline style (the one style
 * channel, mirroring Container's `container-name`), not a class -- 4:3 and
 * 9:16 have no built-in aspect utility and arbitrary values are banned.
 */
export const embedContainerClasses = 'relative overflow-hidden rounded-lg bg-muted';

/**
 * Iframe positioning: absolutely filling the aspect-ratio container.
 */
export const embedIframeClasses = 'absolute inset-0 h-full w-full border-0';

/**
 * Fallback container shown for missing, disallowed, or unresolvable URLs.
 */
export const embedFallbackClasses =
  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center';

/**
 * Fallback message text.
 */
export const embedFallbackMessageClasses =
  'mb-2 text-label-small ts-label-small font-medium text-muted-foreground';

/**
 * Fallback recovery link (Open in new tab).
 */
export const embedFallbackLinkClasses =
  'text-label-small ts-label-small text-primary underline underline-offset-4 hover:text-primary/80';
