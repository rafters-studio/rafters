import type { AccordionConfig, AccordionState } from './accordion.behavior';

export interface AccordionClassSet {
  /** The stack container. Layout is the consumer's; the root is structural. */
  root: string;
  /** One section wrapper: the rule that separates stacked sections. */
  item: string;
  /** The role=heading wrapper the header button lives in. */
  heading: string;
  /** The header button: full-width row, hover feedback, focus ring, disabled dim. */
  trigger: string;
  /** The chevron, rotated off the trigger's data-state via the group variant. */
  triggerIcon: string;
  /** The panel: a grid whose single row animates 0fr<->1fr, the transitionable
   *  stand-in for height:auto. Present in the DOM in both states (never
   *  display:none, which would block the transition); the score projects `inert`
   *  when collapsed to keep the clipped content out of the a11y tree + tab order. */
  content: string;
  /** The panel's inner clip box: min-h-0 + overflow-hidden so the row can
   *  collapse to zero and the padded content is clipped rather than forcing
   *  height. The panel itself stays unpadded so it collapses cleanly. */
  contentInner: string;
}

// The root owns no visual of its own -- it is the styling anchor for the
// data-orientation/data-type/data-disabled the score projects.
const rootClasses = '';

const itemClasses = 'border-b';

const headingClasses = 'flex';

// `motion-hover` is the semantic hover-feedback token (colors, fast/standard,
// preserved under reduced motion) -- it replaces the raw `transition-all
// duration-300`, which was both off the perceptual scale and untethered to a
// token. The header's interactive feedback declares its intent by name.
const triggerClasses =
  'group flex flex-1 items-center justify-between py-4 text-title-small motion-hover ' +
  'hover:underline ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

// The chevron rotates off the trigger's data-state (projected by the score) via
// the group variant. `motion-toggle` (transform, moderate, spring-snappy) is the
// semantic token for a state-flip transform and carries the reduced-motion
// behavior itself, replacing the raw `transition-transform duration-300`.
const triggerIconClasses = 'h-4 w-4 shrink-0 motion-toggle group-data-[state=open]:rotate-180';

// Expand/collapse animate `grid-template-rows` 0fr<->1fr -- the transitionable
// stand-in for height:auto -- via the `motion-expand` / `motion-collapse`
// semantic tokens (normal/enter opening, the faster moderate/exit closing).
// The panel is a grid, present in both states; `motion-reduce` snaps the rows
// and fades opacity (the tokens' reduced-motion property is opacity, so the
// state-driven opacity pair below is what reduced-motion users see). The
// oracle's `animate-accordion-up/down` are NOT ported: they interpolate
// `var(--radix-accordion-content-height)`, which nothing in this system sets.
// grid-rows use `minmax(0, Nfr)`, not bare `Nfr`: a bare `0fr` track keeps its
// automatic minimum at min-content, which the inner box's padding floors above
// zero, so a "collapsed" panel keeps a padding-height gap. `minmax(0, 0fr)`
// pins the floor to 0 so the row truly collapses. Verified in a browser --
// happy-dom does no layout and cannot catch this.
const contentClasses =
  'grid text-body-small ' +
  'data-[state=closed]:grid-rows-[minmax(0,0fr)] data-[state=open]:grid-rows-[minmax(0,1fr)] ' +
  'data-[state=closed]:opacity-0 data-[state=open]:opacity-100 ' +
  'data-[state=open]:motion-expand data-[state=closed]:motion-collapse';

// min-h-0 lets the grid row collapse below the child's min-content height (the
// classic grid-rows-0fr requirement); overflow-hidden clips the padded content
// while the row is closing.
const contentInnerClasses = 'min-h-0 overflow-hidden pb-4 pt-0';

/** The view: class strings keyed by config/state. No logic. */
export function accordionClasses(
  _config: AccordionConfig,
  _state: AccordionState,
): AccordionClassSet {
  return {
    root: rootClasses,
    item: itemClasses,
    heading: headingClasses,
    trigger: triggerClasses,
    triggerIcon: triggerIconClasses,
    content: contentClasses,
    contentInner: contentInnerClasses,
  };
}
