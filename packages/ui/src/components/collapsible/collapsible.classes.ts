import type { CollapsibleConfig, CollapsibleState } from './collapsible.behavior';

export interface CollapsibleClassSet {
  /** The wrapper region. Layout is the consumer's; the wrapper is structural. */
  root: string;
  /** The disclosure trigger button: hover feedback, focus ring, disabled dim. */
  trigger: string;
  /** The revealed region: clips its content and animates the height axis. */
  content: string;
}

// The wrapper owns no visual of its own -- it is the styling anchor for the
// data-state/data-disabled the score projects, which consumers key off.
const rootClasses = '';

const triggerClasses =
  'inline-flex items-center hover:bg-muted ' +
  'transition-colors duration-fast motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'ring-offset-background focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

// Motion intent (declared, not keyframed): expand/collapse along the height
// axis. overflow-hidden clips the region while it grows/shrinks; the transition
// carries the token-scale duration and yields to reduced-motion. The oracle's
// `animate-collapsible-up/down` utilities were never defined in the token
// system, so porting them would be dead classes (see collapsible.md).
const contentClasses =
  'overflow-hidden transition-all duration-moderate motion-reduce:transition-none';

/** The view: class strings keyed by config/state. No logic. */
export function collapsibleClasses(
  _config: CollapsibleConfig,
  _state: CollapsibleState,
): CollapsibleClassSet {
  return {
    root: rootClasses,
    trigger: triggerClasses,
    content: contentClasses,
  };
}
