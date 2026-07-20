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
  /** The panel: clips its content and carries the height-axis motion intent. */
  content: string;
  /** The panel's inner padding box (the panel itself must stay unpadded so it
   *  can collapse to zero height). */
  contentInner: string;
}

// The root owns no visual of its own -- it is the styling anchor for the
// data-orientation/data-type/data-disabled the score projects.
const rootClasses = '';

const itemClasses = 'border-b';

const headingClasses = 'flex';

const triggerClasses =
  'group flex flex-1 items-center justify-between py-4 text-title-small ' +
  'transition-all duration-300 motion-reduce:transition-none ' +
  'hover:underline ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

// The icon rotates off the trigger's data-state (projected by the score) via
// the group variant, so the projection writes one attribute per trigger and the
// chevron follows for free.
const triggerIconClasses =
  'h-4 w-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

// Motion intent (declared, not keyframed): expand/collapse along the height
// axis. overflow-hidden clips the panel while it grows/shrinks; the transition
// carries the token-scale duration and yields to reduced motion. The oracle's
// `data-[state=*]:animate-accordion-up/down` utilities are NOT ported: their
// keyframes interpolate `var(--radix-accordion-content-height)`, a Radix-owned
// variable nothing in this system ever sets, so they animate to an undefined
// height (see accordion.md dispositions).
const contentClasses =
  'overflow-hidden text-body-small transition-all duration-300 motion-reduce:transition-none';

const contentInnerClasses = 'pb-4 pt-0';

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
