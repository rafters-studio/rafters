/**
 * Shared class strings for the Breadcrumb composition family. The root nav
 * carries no classes of its own (it is a pure landmark); the visual rhythm
 * lives on the consumer-composed sub-parts. These are config-independent
 * literals, so the framework files import them directly (no context/provider
 * needed for a flat static) -- ported verbatim from the oracle's settled
 * composition. `text-label-medium ts-label-medium` / `text-foreground` / `text-muted-foreground`
 * are the semantic role tokens; `transition-colors` is the sole motion intent
 * (link hover colour), recorded in the matrix as `motion.current`.
 */

export const breadcrumbListClasses =
  'flex flex-wrap items-center gap-1.5 break-words text-label-medium ts-label-medium text-muted-foreground @sm:gap-2.5';

export const breadcrumbItemClasses = 'inline-flex items-center gap-1.5';

/**
 * `breadcrumb / link / hover` in `packages/ui/docs/spec/matrix/motion.jsonl`
 * assigns tier `fast` and curve role `standard` (provenance `baseline`) to a
 * colour change (`background, text, border`) on a link that stays put -- a
 * TRANSITION, named as composed generics. `ease-standard` was the half of the
 * row this file had not yet named.
 *
 * NO component-level reduced-motion escape. The generated `duration-*` and
 * `delay-*` utilities zero themselves under `prefers-reduced-motion` (the
 * exporter's `REDUCED_MOTION_ZEROED` set), so reduced motion is the token
 * sheet's responsibility and never a component-level media query.
 */
export const breadcrumbLinkClasses =
  'transition-colors duration-fast ease-standard hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const breadcrumbPageClasses = 'text-foreground';

export const breadcrumbSeparatorClasses = '[&>svg]:size-3.5';

export const breadcrumbEllipsisClasses = 'flex h-9 w-9 items-center justify-center';
