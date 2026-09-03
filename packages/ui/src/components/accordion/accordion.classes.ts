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

// motion.jsonl `accordion / trigger / hover` -- color (background, text,
// border), fast, standard. Composed generics on a transition, because the header
// stays put while its colours change. Replaces `motion-hover`, one of the 13
// semantic motion tokens deleted by ruling (2026-08-02) that kept compiling.
//
// NO ROW for the trigger's focus ring or for `hover:underline`: the ring is a
// `ring` movement and the underline a text-decoration change, and the matrix
// assigns neither for accordion. Both stay instant rather than borrowing a tier.
const triggerClasses =
  'group flex flex-1 items-center justify-between py-4 text-title-small ts-title-small ' +
  'transition-colors duration-fast ease-standard ' +
  'hover:underline ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

// motion.jsonl `accordion / chevron / open <-> closed` -- rotate
// (transform: rotate), moderate, standard, extent structural (180deg). A
// rotation on an element that stays put, so it is a transition; the 180deg is
// mechanics, which is why it is written as `rotate-180` and not as an extent.
// Replaces `motion-toggle` (retired), which also named the WRONG curve for this
// row -- spring-snappy where the row assigns standard.
const triggerIconClasses =
  'h-4 w-4 shrink-0 transition-transform duration-moderate ease-standard ' +
  'group-data-[state=open]:rotate-180';

// motion.jsonl `accordion / content / closed -> open` (reveal (y) + fade,
// normal, enter) and `accordion / content / open -> closed` (reveal (y) + fade,
// moderate, exit). Both properties the rows name are transitioned here:
// `grid-rows / height` as `grid-template-rows`, and `opacity` as the fade half.
//
// REVEAL IS A TRANSITION, NOT A KEYFRAME (docs/MOTION.md:115). Expand/collapse
// animate `grid-template-rows` 0fr<->1fr, never `height` -- `height: auto` is
// not transitionable, and a grid row animates on an element that stays present,
// which is why no `animate-*` cell exists for either row.
//
// WHICH RULE OWNS THE TIMING: the one matching the state being transitioned
// INTO. Opening resolves the `data-[state=open]` rule, so that rule carries the
// open row's normal/enter; closing resolves `data-[state=closed]` and its
// moderate/exit. Same mechanism navigation-menu's panel uses.
//
// The opacity pair is the rows' FADE half, not a reduced-motion fallback -- the
// reduced-motion law is written once on the duration leaves and reaches these
// transitions without a word here. The oracle's `animate-accordion-up/down` are
// NOT ported: they interpolate `var(--radix-accordion-content-height)`, which
// nothing in this system sets.
//
// grid-rows use `minmax(0, Nfr)`, not bare `Nfr`: a bare `0fr` track keeps its
// automatic minimum at min-content, which the inner box's padding floors above
// zero, so a "collapsed" panel keeps a padding-height gap. `minmax(0, 0fr)`
// pins the floor to 0 so the row truly collapses. Verified in a browser --
// happy-dom does no layout and cannot catch this.
const contentClasses =
  'grid text-body-small ts-body-small ' +
  'transition-[grid-template-rows,opacity] ' +
  'data-[state=closed]:grid-rows-[minmax(0,0fr)] data-[state=open]:grid-rows-[minmax(0,1fr)] ' +
  'data-[state=closed]:opacity-0 data-[state=open]:opacity-100 ' +
  'data-[state=open]:duration-normal data-[state=open]:ease-enter ' +
  'data-[state=closed]:duration-moderate data-[state=closed]:ease-exit';

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
