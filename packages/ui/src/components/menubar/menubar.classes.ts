import type { MenubarConfig, MenubarState } from './menubar.behavior';

export interface MenubarClassSet {
  root: string;
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
  inset: string;
  menuHost: string;
}

// Motion is CSS the browser applies from the generics each matrix row assigns
// (docs/spec/05-authoring.md, "Motion: generics per the matrix row"), the way
// drawer does it: every menu stays present, and the projected open axis
// (data-state) drives a transition between a closed pose and an open pose.
// Closed, a menu is inert (set by the performance, not here), so it is out of
// the accessibility tree and the tab order whatever its pose.
//
// FIVE MATRIX ROWS NAME THIS COMPONENT; all five are consumed below. Reported,
// per the authoring rule, not invented:
//   - menubar / trigger / hover is a pointer moment with no pose of its own
//     here: the trigger has no hover fill, so on a closed bar a hover changes
//     nothing. Its colour moves on focus and when its menu opens (on an open
//     bar the pointer crossing a trigger opens that menu), and the row's
//     timing is what that colour move runs on. The focus colour move has no
//     row of its own.
//   - The checkbox and radio indicators appear and disappear with no row, so
//     they stay still.

const rootClasses = 'flex h-9 items-center gap-1 rounded-md border bg-background p-1';

// The open menu's trigger keeps the accent fill while focus is inside its menu.
//
// THE ROW: menubar / trigger / hover -- color over background, text, border
// (fast, standard). The trigger stays put and only its fill and text colour
// move, so the row is a transition of the colour properties.
const triggerClasses =
  'flex cursor-default select-none items-center rounded-sm px-3 py-1 ' +
  'text-label-medium ts-label-medium outline-none ' +
  'transition-colors duration-fast ease-standard ' +
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground ' +
  'disabled:pointer-events-none disabled:opacity-50';

// z-depth-dropdown is the semantic depth token; fill (bg-popover), not a raw
// color. The menu's coordinates are written by positionMenubarContent, not
// here. `fixed` is here because every menu is now present while closed: out
// of flow, a closed menu takes no room in the bar (where the performances
// author it before bind or before the React host mounts) or after it.
//
// TWO MATRIX ROWS NAME THIS PART.
//
//   menubar / content / closed -> open (moderate, enter, extent pop) and
//   menubar / content / open -> closed (fast, exit, extent pop): fade + zoom
//   over opacity and transform: scale. The closed row is the base rule and the
//   open row is the data-[state=open] rule: whichever pose applies owns the
//   duration and curve of the transition into it. The zoom rides `extent-pop`,
//   as context-menu's submenu does: `extent-pop` picks the member (writing the
//   `--rafters-consumed-extent` alias) and `scale-(--rafters-consumed-extent)`
//   reads that alias back, so the closed pose sits at the pop extent and the
//   open pose at full size.
//
// `transition`, not `transition-all`: the named default set covers opacity and
// scale but not the inset properties, and positionMenubarContent rewrites
// `left`/`top` on every open. Under `transition-all` a menu reopened after a
// scroll would slide from its old place, a movement no row assigns.
const contentClasses =
  'fixed z-depth-dropdown min-w-48 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg stagger-items ' +
  'opacity-0 pointer-events-none extent-pop scale-(--rafters-consumed-extent) ' +
  'transition duration-fast ease-exit ' +
  'data-[state=open]:opacity-100 data-[state=open]:scale-100 ' +
  'data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter';

// The active item is the roving-focus current item, styled via :focus. No
// data-highlighted axis (the highlight is ephemeral DOM focus, not score state).
//
// THE ROW: menubar / items / highlight move -- color, duration-micro,
// ease-standard. The item stays put and only its fill and text colour move, so
// it is a transition. Both values carry provenance "proposed" in the matrix: a
// starting position, never reviewed, transcribed as written.
//
// THE SECOND ROW: menubar / items / enter -- fade (with content), which assigns
// `delay-stagger-step` and no duration and no curve. The delay is per POSITION,
// so it is selected on the content, the item collection's container: it carries
// `stagger-items` (#2189), the generated utility that gives each direct child its
// own rung of the ladder, saturating at 12. This file only names it
// (00-boundaries.md Sec 6). `--rafters-delay-stagger-step` defaults to 0ms, so
// at the default intent the items enter with the content as one block. The item
// carries no delay of its own: `transition-delay` is per element, so a delay
// here would hold back the highlight-colour transition too. The highlight never
// waits.
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

// Aligns inset labels/items with the checkbox/radio indicator column.
const insetClasses = 'pl-8';

// The React host the menus portal into, right after the bar. It generates no
// box of its own, so it never joins the layout the bar sits in; the menus
// inside are fixed-positioned under their triggers.
const menuHostClasses = 'contents';

export function menubarClasses(_config: MenubarConfig, _state: MenubarState): MenubarClassSet {
  return {
    root: rootClasses,
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
    inset: insetClasses,
    menuHost: menuHostClasses,
  };
}
