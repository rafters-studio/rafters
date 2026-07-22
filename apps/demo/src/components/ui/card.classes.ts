import { resolveFillName } from '@/lib/primitives/fill-resolver';
import type { CardConfig, CardState } from '@/components/ui/card.behavior';

export interface CardClassSet {
  root: string;
}

/**
 * Structure the surface always carries: an elevated, bordered, rounded
 * panel. Colour is kept separate so a resolved `fill` can replace the
 * default `bg-card` surface without leaving a competing `bg-*` behind.
 */
const cardStructureClasses = 'rounded-lg border border-card-border shadow-sm';

/** Default surface token pairing -- card's identity when no fill resolves. */
const cardSurfaceClasses = 'bg-card text-card-foreground';

/**
 * Sub-part classes are config-independent literals, so the framework files
 * import them directly (no context/provider needed for a flat static). Ported
 * verbatim from the oracle's settled composition; `text-title-medium` /
 * `text-body-small` are the semantic typography role tokens.
 */
export const cardHeaderClasses = 'flex flex-col gap-1.5 p-6';

export const cardTitleClasses = 'text-title-medium leading-none';

export const cardDescriptionClasses = 'text-body-small text-muted-foreground';

export const cardContentClasses = 'p-6 pt-0';

export const cardFooterClasses = 'flex items-center p-6 pt-0';

/** Trailing action, positioned into the header grid (shadcn v4 surface). */
export const cardActionClasses = 'col-start-2 row-span-2 row-start-1 self-start justify-self-end';

export function cardClasses(config: CardConfig, _state: CardState): CardClassSet {
  // A resolved fill REPLACES the default surface (bg + paired foreground),
  // so the two never coexist -- no reliance on compiled source-order to pick
  // a winner. An invalid/empty signature keeps the default card surface.
  const fillClasses = config.fill ? resolveFillName(config.fill, 'surface') : '';
  const surface = fillClasses || cardSurfaceClasses;
  return { root: `${surface} ${cardStructureClasses}` };
}
