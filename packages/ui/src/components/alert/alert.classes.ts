import classy from '../../primitives/classy';
import type { AlertConfig, AlertState, AlertVariant } from './alert.behavior';

export interface AlertClassSet {
  root: string;
}

/**
 * THE CELL IS THE SPEC. `animate-fade-in-normal-enter` is the generated
 * consumption of `alert / root / appear` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` -- keyframe `fade-in`, tier
 * `normal`, curve role `enter`, all three read off the row. No literal
 * duration, no literal easing, no per-component motion token.
 *
 * NARROWED TO A FADE, on the operator's ruling (2026-09-02). The row's
 * movement reads `fade + slide (y, small)` with a `structural` extent
 * ("spacing-derived nudge"); the ruling is that an alert fades and does not
 * slide, so the slide half and the nudge are dropped rather than approximated.
 * The token layer already agrees -- `alert-root-appear` in
 * `DEFAULT_MOTION_CELL_ANIMATIONS` names the shape `fade-in` and no extent --
 * so the jsonl row is the artifact still to be corrected.
 *
 * KEYED OFF THE MOUNT, not a state attribute. An alert has no open/closed
 * state: it appears when it renders, so the animation is unconditional on the
 * root. `data-[state=...]` here would name a state nothing sets.
 *
 * NO motion-reduce escape. The reduced-motion law is written on the duration
 * and easing leaves the generated utility references, so it reaches this
 * animation without a line here.
 *
 * The row is marked `proposed` in the matrix -- a starting position, never
 * reviewed.
 */
const baseClasses =
  'relative w-full rounded-lg border p-4 animate-fade-in-normal-enter ' +
  'grid grid-cols-menu-row [&>svg]:col-start-2 [&>svg]:row-start-1 [&>svg]:row-span-2 [&>svg]:me-3 [&>svg+div]:-translate-y-0.5';

/**
 * Subtle background paired with its OWN subtle-foreground token, never the
 * solid variant's foreground -- the oracle pairs `bg-*-subtle` with the
 * solid `text-*-foreground`, which is contrast-tuned against the SOLID
 * fill, not the subtle one (defect-do-not-port, see the component doc).
 * `muted` has no subtle tier in the registry, so it keeps the flat
 * muted/border pairing the oracle already used.
 */
const variantClasses: Record<AlertVariant, string> = {
  default: 'bg-primary-subtle text-primary-subtle-foreground border-primary-border',
  primary: 'bg-primary-subtle text-primary-subtle-foreground border-primary-border',
  secondary: 'bg-secondary-subtle text-secondary-subtle-foreground border-secondary-border',
  destructive: 'bg-destructive-subtle text-destructive-subtle-foreground border-destructive-border',
  success: 'bg-success-subtle text-success-subtle-foreground border-success-border',
  warning: 'bg-warning-subtle text-warning-subtle-foreground border-warning-border',
  info: 'bg-info-subtle text-info-subtle-foreground border-info-border',
  muted: 'bg-muted text-muted-foreground border-border',
  accent: 'bg-accent-subtle text-accent-subtle-foreground border-accent-border',
};

/** Sub-parts are config-independent, so the framework file imports these
 *  literals directly (no context/provider needed for a flat static). */
export const alertTitleClasses = 'col-start-3 mb-1 text-title-small ts-title-small leading-none';

export const alertDescriptionClasses =
  'col-start-3 text-body-small ts-body-small [&_p]:leading-relaxed';

export const alertActionClasses = 'col-start-4 row-start-1 row-span-2 ms-3 shrink-0';

export function alertClasses(config: AlertConfig, _state: AlertState): AlertClassSet {
  // Fill, then an explicit variant, then surface, then base (the default
  // variant): an absent variant does not beat surface (FR-RAF-FILL-004).
  const surface =
    config.variant === undefined
      ? classy.surface(config.surface, variantClasses.default)
      : variantClasses[config.variant];
  // The class set carries only declared parts (Spec 01: Partial<Record<Part,
  // string>>); the sub-component literals above are the direct imports.
  return {
    root: `${baseClasses} ${classy.fill(config.fill, surface)}`,
  };
}
