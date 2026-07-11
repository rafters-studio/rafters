/**
 * Empty -- decoration only. No config, no state: every part's class string
 * is fixed (Spec 00, static archetype). Ported verbatim from the oracle
 * (src/old/ui/empty.classes.ts) except the two renamed parts noted below.
 */

export interface EmptyClassSet {
  root: string;
  media: string;
  title: string;
  description: string;
  actions: string;
}

const rootClasses = 'flex flex-col items-center justify-center gap-4 py-12 text-center';

/** Oracle: emptyIconClasses. Renamed media -- the slot holds icons AND
 *  illustrations, not icons only; the token classes are unchanged. */
const mediaClasses = 'text-muted-foreground [&>svg]:h-12 [&>svg]:w-12';

const titleClasses = 'text-title-medium text-foreground';

const descriptionClasses = 'max-w-sm text-body-small text-muted-foreground';

/** Oracle: emptyActionClasses (also ''). Renamed actions -- plural, since
 *  the wrapper already held more than one button. */
const actionsClasses = '';

export function emptyClasses(): EmptyClassSet {
  return {
    root: rootClasses,
    media: mediaClasses,
    title: titleClasses,
    description: descriptionClasses,
    actions: actionsClasses,
  };
}
