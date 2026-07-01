/**
 * Shared embed class definitions
 *
 * Parallel to embed.styles.ts. Tailwind class strings for the React target
 * (embed.tsx) and any future embed.astro target so visual parity holds
 * across framework targets.
 *
 * Scope covers the iframe display path only -- the Twitter-widget flow,
 * editable URL input, drag/drop upload, and alignment toolbar remain
 * React-target concerns and do not appear here.
 */

/**
 * Outer container wrapping the iframe. Matches the React target's
 * "relative overflow-hidden rounded-lg bg-muted" container div.
 */
export const embedContainerClasses = 'relative overflow-hidden rounded-lg bg-muted';

/**
 * Iframe positioning. Matches the React target's
 * "absolute inset-0 h-full w-full border-0" iframe styling.
 */
export const embedIframeClasses = 'absolute inset-0 h-full w-full border-0';

/**
 * Fallback container shown for missing or disallowed URLs. Matches the
 * React target's EmbedFallback wrapper chrome.
 */
export const embedFallbackClasses =
  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center';

/**
 * Fallback message text styling.
 */
export const embedFallbackMessageClasses =
  'mb-2 text-label-small font-medium text-muted-foreground';

/**
 * Fallback external link styling (Open in new tab).
 */
export const embedFallbackLinkClasses =
  'text-label-small text-primary underline underline-offset-4 hover:text-primary/80';

/**
 * Accepted aspect-ratio keys shared across framework targets. Mirrors the
 * AspectRatio type exported from embed.tsx and the AspectRatioKey contract
 * in embed.styles.ts.
 */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';
