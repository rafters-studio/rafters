import type { AriaAttrs, BehaviorSpec } from '../../lib/contract';

/**
 * Breadcrumb: a static score -- no state, no actions, no keymap, no
 * effects -- but the accessible-name projection on `root` is real, which
 * is what earns this tier a behavior file at all (container's and grid's
 * silent-furniture root would not).
 *
 * Structural compound, same shape as navigation-menu.behavior.ts: `root`
 * is the only formally declared part (list/item/link/page/separator/
 * ellipsis are sibling performances in this directory, matching
 * navigation-menu-list.astro/-item.astro/-link.astro). The current-page
 * crumb is not inferred from array position or slot introspection --
 * the consumer DECLARES it by choosing to render breadcrumb-page.astro
 * instead of breadcrumb-link.astro, exactly as grid-item.astro's
 * `priority` prop is a per-instance declaration, not a derived fact.
 */
export interface BreadcrumbConfig {
  /** Accessible name for the nav landmark. Default 'Breadcrumb' (oracle
   *  parity: shadcn/WAI-ARIA convention). */
  ariaLabel?: string | undefined;
}

export type BreadcrumbState = Record<never, never>;
export type BreadcrumbActions = Record<never, never>;
export type BreadcrumbPart = 'root';

export const breadcrumb: BehaviorSpec<
  BreadcrumbConfig,
  BreadcrumbState,
  BreadcrumbActions,
  BreadcrumbPart
> = {
  name: 'breadcrumb',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: (_state, config) => ({
    root: { 'aria-label': config.ariaLabel ?? 'Breadcrumb' },
  }),
  keymap: () => null,
  effects: () => [],
};

/**
 * breadcrumb-page.astro's projection: rendering this component instead of
 * breadcrumb-link.astro IS the declaration of "current". `role="link"` +
 * `aria-disabled="true"` keeps it visually and structurally consistent
 * with its link siblings while `aria-current="page"` tells assistive tech
 * it is not navigable (oracle: BreadcrumbPage, matches the WAI-ARIA
 * breadcrumb pattern; not a defect). No boolean parameter -- unlike
 * navigation-menu's `navTriggerAria`/`navContentAria`, which take a
 * VALUE to look up in shared state, this part has no state to consult;
 * the projection is a constant.
 */
export function breadcrumbPageAttrs(): AriaAttrs {
  return { role: 'link', 'aria-disabled': 'true', 'aria-current': 'page' };
}
