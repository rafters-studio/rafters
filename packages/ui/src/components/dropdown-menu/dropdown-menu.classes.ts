/**
 * @primitives classy
 */
import classy from '../../primitives/classy';
import type { DropdownMenuConfig, DropdownMenuState } from './dropdown-menu.behavior';

export interface DropdownMenuClassSet {
  trigger: string;
  content: string;
  item: string;
  checkboxItem: string;
  radioItem: string;
  itemIndicator: string;
  startIcon: string;
  itemLabel: string;
  checkIcon: string;
  radioDot: string;
  separator: string;
  shortcut: string;
  label: string;
  group: string;
}

// The trigger is usually composed onto a Button via asChild; these are the
// modest defaults for the bare <button> the decorators fall back to.
const triggerClasses =
  'inline-flex items-center justify-center gap-2 rounded-md ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** The content panel's base surface; a fill replaces it (FR-RAF-FILL-003). */
const contentSurfaceClasses = 'bg-popover text-popover-foreground';

// z-depth-dropdown is the semantic depth token; fill (bg-popover), not a raw
// color. Enter/exit is PRESENCE (#1996): the menu is present-but-hidden, so the
// keyframe starts as the node leaves display:none -- no @starting-style -- and
// usePresence withholds `hidden` until the exit keyframe ends.
//
// THE CELL IS THE SPEC (#2017). These two utilities are the generated
// consumption of two rows of packages/ui/docs/spec/matrix/motion.jsonl --
// dropdown-menu / content / closed -> open (moderate, enter, extent pop) and
// dropdown-menu / content / open -> closed (fast, exit, extent pop). The
// assignments match popover's today and the cells stay SEPARATE anyway: the
// matrix declares two moments, and the day one is retuned a shared name would
// drag the other with it. Collapsing distinct cells is the #2012 defect.
//
// NO reduced-motion animation escape -- the generated utility zeroes
// animation-duration under the media query instead, which keeps the keyframe's
// end state. An animation reset here would win destructively: `animation: none`
// resets the shorthand and discards the zeroed duration with it.
//
// THE ROW (#2459): the content is a grid on grid-cols-menu-row (indicator,
// icon, label, end) and each item a subgrid row, so the columns line up across
// items and the icon sits on the right on a dir="rtl" page with no direction
// class.
const contentClasses =
  'grid grid-cols-menu-row z-depth-dropdown min-w-32 overflow-hidden rounded-md border p-1 ' +
  'shadow-lg ' +
  'data-[state=open]:animate-scale-in-moderate-enter ' +
  'data-[state=closed]:animate-scale-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

// The active item is the roving-focus current item, styled via :focus. No
// data-highlighted axis (the highlight is ephemeral DOM focus, not score state).
//
// THE ROW: dropdown-menu / items / highlight move -- color, duration-micro,
// ease-standard (motion.md:172). A transition, not a keyframe: the item stays
// put and only its fill and text colour move, which is why the row is excluded
// from the cell vocabulary by name (`dropdown-menu | items | highlight move`,
// EXCLUDED_ROWS.noIntersectingProperty in
// packages/design-tokens/test/motion-cells.test.ts) and consumes the generics
// here instead. The row is marked PROPOSED in the matrix -- a starting position
// for the knobs, never reviewed -- and is transcribed as written.
//
// THE SECOND ROW: dropdown-menu / items / enter -- fade (with content), which
// assigns `delay-stagger-step` and NO duration and NO curve (motion.jsonl:38).
// `duration: {"kind":"none"}` means the row assigns no duration, not that it
// assigns nothing: the delay generic IS the whole assignment, so the whole
// consumption is naming it. The fade itself is the CONTENT's keyframe -- that
// is what "with content" says -- and this class only carries the offset.
//
// ZERO IS THE ASSIGNMENT, NOT A GAP. `delay-stagger-step` resolves to 0ms at
// the efficient intent, so this class changes nothing on screen today, and
// that is the point rather than a reason to omit it: a later retune reaches
// these lists because a consumer exists to move. The silence below is a value
// somebody chose, not an oversight, and the next reader should not remove the
// class on the theory that it does nothing.
//
// ONE COUPLING TO KNOW ABOUT: `transition-delay` is per ELEMENT, exactly like
// `transition-duration`, so this delay also sits on the highlight-move
// transition above. At 0ms nothing shows. A non-zero `stagger-step` retune
// would delay the highlight as well as the entrance, which is a matrix
// question (the two rows share one element and the vocabulary has no
// per-property delay), not something this file can resolve.
const itemBase =
  'grid grid-cols-subgrid col-span-full cursor-default select-none items-center rounded-sm px-2 py-1.5 ' +
  'has-data-[icon=inline-start]:ps-1.5 text-body-small ts-body-small outline-none ' +
  'transition-colors duration-micro ease-standard delay-stagger-step ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemClasses = itemBase;

const checkboxItemClasses = itemBase;

const radioItemClasses = itemBase;

const itemIndicatorClasses =
  'col-start-1 row-start-1 me-2 flex h-3.5 w-3.5 items-center justify-center';

// The wrapper only places and hides: the brand brings its icons, sizing
// included. The margin spaces the icon from the label.
const startIconClasses = 'col-start-2 row-start-1 me-2 inline-grid place-items-center';

// The label cell takes the label column and the end column, so a shortcut
// pushed to the end with ms-auto sits at the row's end.
const itemLabelClasses = 'col-start-3 col-span-2 row-start-1 flex min-w-0 items-center gap-2';

const checkIconClasses = 'h-4 w-4';

const radioDotClasses = 'h-2 w-2 rounded-full bg-current';

const separatorClasses = 'col-span-full -mx-1 my-1 h-px border-0 bg-muted';

const shortcutClasses = 'ms-auto text-shortcut ts-shortcut opacity-60';

const labelClasses = 'col-span-full px-2 py-1.5 text-label-medium ts-label-medium';

const groupClasses = 'grid grid-cols-subgrid col-span-full';

export function dropdownMenuClasses(
  config: DropdownMenuConfig,
  _state: DropdownMenuState,
): DropdownMenuClassSet {
  return {
    trigger: triggerClasses,
    content: `${classy.fill(config.fill, classy.surface(config.surface, contentSurfaceClasses))} ${contentClasses}`,
    item: itemClasses,
    checkboxItem: checkboxItemClasses,
    radioItem: radioItemClasses,
    itemIndicator: itemIndicatorClasses,
    startIcon: startIconClasses,
    itemLabel: itemLabelClasses,
    checkIcon: checkIconClasses,
    radioDot: radioDotClasses,
    separator: separatorClasses,
    shortcut: shortcutClasses,
    label: labelClasses,
    group: groupClasses,
  };
}
