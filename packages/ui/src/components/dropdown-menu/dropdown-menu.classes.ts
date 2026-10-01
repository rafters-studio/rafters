import type { DropdownMenuConfig, DropdownMenuState } from './dropdown-menu.behavior';

export interface DropdownMenuClassSet {
  trigger: string;
  content: string;
  item: string;
  checkboxItem: string;
  radioItem: string;
  itemIndicator: string;
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
// NO motion-reduce:animate-none -- the generated utility zeroes
// animation-duration under the media query instead, which keeps the keyframe's
// end state. animate-none here would win destructively: `animation: none`
// resets the shorthand and discards the zeroed duration with it.
//
// THE ITEMS' ENTER ROW LIVES HERE TOO: dropdown-menu / items / enter -- fade
// (with content), which assigns `delay-stagger-step` and NO duration and NO
// curve (motion.jsonl:38). The delay is per POSITION, so the content -- the
// item collection's container -- selects `stagger-items` (#2189): the
// generated utility gives each direct child its own rung of the ladder, saturating
// at 12. The ladder is built once in the exporter; this file only names it
// (00-boundaries.md Sec 6). It reaches the children, never the content's own
// scale keyframe. `--rafters-delay-stagger-step` defaults to 0ms, so at the
// default intent the items enter with the content as one block, as shadcn's
// do; a later retune reaches them because a consumer exists to move.
const contentClasses =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg stagger-items ' +
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
// The items' enter row (the stagger) is on the container above, not here:
// `transition-delay` is per ELEMENT, so a delay on the item would hold back
// this highlight-colour transition too. The highlight never waits.
const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small ts-body-small outline-none ' +
  'transition-colors duration-micro ease-standard ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const itemClasses = `${itemBase} gap-2 px-2 py-1.5`;

const checkboxItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const radioItemClasses = `${itemBase} py-1.5 pl-8 pr-2`;

const itemIndicatorClasses = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const checkIconClasses = 'h-4 w-4';

const radioDotClasses = 'h-2 w-2 rounded-full bg-current';

const separatorClasses = '-mx-1 my-1 h-px border-0 bg-muted';

const shortcutClasses = 'ml-auto text-shortcut ts-shortcut opacity-60';

const labelClasses = 'px-2 py-1.5 text-label-medium ts-label-medium';

const groupClasses = '';

export function dropdownMenuClasses(
  _config: DropdownMenuConfig,
  _state: DropdownMenuState,
): DropdownMenuClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
    item: itemClasses,
    checkboxItem: checkboxItemClasses,
    radioItem: radioItemClasses,
    itemIndicator: itemIndicatorClasses,
    checkIcon: checkIconClasses,
    radioDot: radioDotClasses,
    separator: separatorClasses,
    shortcut: shortcutClasses,
    label: labelClasses,
    group: groupClasses,
  };
}
