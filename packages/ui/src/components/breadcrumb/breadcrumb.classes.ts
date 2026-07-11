import type { BreadcrumbConfig, BreadcrumbState } from './breadcrumb.behavior';

export interface BreadcrumbClassSet {
  root: string;
}

/**
 * Ported verbatim from the oracle (src/old/ui/breadcrumb.classes.ts):
 * text-tier tokens throughout (text-muted-foreground / text-foreground),
 * no bg-*-subtle paired against solid *-foreground text -- the known
 * oracle contrast-defect class does not appear here. Six literals, one
 * per structural role; none are config-conditional so none live behind
 * `breadcrumbClasses`.
 */
export const breadcrumbListClasses =
  'flex flex-wrap items-center gap-1.5 break-words text-label-medium text-muted-foreground @sm:gap-2.5';

export const breadcrumbItemClasses = 'inline-flex items-center gap-1.5';

export const breadcrumbLinkClasses =
  'transition-colors duration-150 motion-reduce:transition-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const breadcrumbPageClasses = 'text-foreground';

export const breadcrumbSeparatorClasses = '[&>svg]:size-3.5';

export const breadcrumbEllipsisClasses = 'flex h-9 w-9 items-center justify-center';

/** Root (`<nav>`) carries no decoration of its own in the oracle -- every
 *  visual choice lives on the children above. Still a function, matching
 *  Spec 01's `xClasses: (config, state) => Partial<Record<Part, string>>`
 *  contract shape. */
export function breadcrumbClasses(
  _config: BreadcrumbConfig,
  _state: BreadcrumbState,
): BreadcrumbClassSet {
  return { root: '' };
}
