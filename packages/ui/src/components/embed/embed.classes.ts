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
 *
 * THE CELL IS THE SPEC. `animate-fade-in-moderate-enter` is the generated
 * consumption of `embed / frame / load` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` -- keyframe `fade-in`, tier
 * `moderate`, curve role `enter`. A load is an arrival, so it is a keyframe,
 * not a transition, and it names no literal duration or easing.
 *
 * KEYED OFF THE MOUNT: the iframe renders only once the resolver accepts the
 * URL, so its first paint is the load moment and no state attribute is
 * involved.
 *
 * PART-NAME GAP, reported not resolved: the row names the part `frame`, and
 * Embed's part vocabulary (`EmbedPart`) is `'root'` alone -- the element that
 * loads is this iframe, and the surrounding `embedContainerClasses` box is the
 * static aspect-ratio frame. The motion goes on the loading element; the
 * matrix and the score disagree about what to call it.
 *
 * The row is marked `proposed` -- a starting position, never reviewed.
 */
export const embedIframeClasses =
  'absolute inset-0 h-full w-full border-0 animate-fade-in-moderate-enter';

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
