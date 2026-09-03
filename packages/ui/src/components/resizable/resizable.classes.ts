import type { ResizableConfig, ResizableDirection, ResizableState } from './resizable.behavior';

export interface ResizableClassSet {
  root: string;
  panel: string;
  handle: string;
  grip: string;
  gripIcon: string;
}

// The group is a flex container; the axis maps directly to flex-direction.
const baseRootClasses = 'flex h-full w-full';

const rootDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

// Panels do not grow/shrink; their flex-basis carries the percent the score
// paints. `overflow-hidden` keeps content from spilling past a shrunk panel.
//
// The two panel rows are the same movement -- "travel" over `position along a
// track` -- split by what drives it, and they get different treatment for
// exactly that reason (#2298).
//
// PANELS / KEYBOARD STEP -- duration-fast, ease-standard, extent structural
// (step), marked `proposed` (unreviewed). A DISCRETE step: `keyDelta` resolves
// an arrow/Home/End into a percent delta and the commit repaints flex-basis in
// one jump. The step distance is the travel, so it animates, and this is the
// base rule.
//
// PANELS / DRAGGING -- "travel", and its `duration.kind` in motion.jsonl is
// literally "pointer-rule", not a tier. THE ABSENCE OF A TIER IS THE
// ASSIGNMENT, not an oversight: while the pointer drives the boundary the
// panels track it EXACTLY, no class expresses "instant", and any nonzero
// duration is the defect. So the drag turns the transition OFF rather than
// shortening it -- the one thing this row can be given is silence, and it is
// spelled as `transition-none` only because the keyboard-step row above puts a
// live transition on the same element that has to be taken back. The only
// marker a stylesheet can see is `data-dragging`, which
// `composeResizableInteractions` sets on the dragged HANDLE -- not on the root
// and not on the panels -- so the discriminator is the group root having a
// dragging handle among its direct children, and the panels are its siblings.
// Spelled out in full below rather than interpolated: Tailwind extracts
// candidates from this file's SOURCE TEXT, so a candidate assembled at runtime
// exists nowhere it reads and compiles to nothing, silently. Pinned against the
// real Tailwind CLI in test/components/resizable/resizable.classes.test.ts.
const basePanelClasses =
  'relative grow-0 shrink-0 overflow-hidden ' +
  'transition-[flex-basis] duration-fast ease-standard ' +
  '[[data-part=root]:has(>[data-part=handle][data-dragging])>&]:transition-none';

// The handle presentation rides the projected data-attributes (data-disabled,
// data-dragging), not swapped strings: one class set covers every state and the
// CSS reads the flags -- so light-DOM markup, the WC, and React look identical.
//
// HANDLE / HOVER / ACTIVE -- "color + elevation" (background, text, border, and
// box-shadow) at duration-fast, ease-standard. The handle stays put, so it is a
// transition, and the property list names the row's own properties rather than
// the shorthand colour utility, which omits box-shadow. Both the hover fill and the
// data-dragging fill below transition on this one pair -- the row covers hover
// and active together. The handle carries no shadow of its own today, so the
// elevation half is declared and currently has nothing to move; that is the
// row's assignment honoured, not a shadow this file invented.
const baseHandleClasses =
  'relative flex items-center justify-center bg-border ' +
  'transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard ' +
  'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 ' +
  'hover:bg-muted ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 ' +
  'data-[dragging]:bg-primary ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

const handleDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'w-px cursor-col-resize after:w-1',
  vertical: 'h-px cursor-row-resize after:h-1',
};

// The optional grip affordance (withHandle) -- a small draggable-looking chip.
const baseGripClasses = 'z-10 flex items-center justify-center rounded-sm border bg-border';

const gripDirectionClasses: Record<ResizableDirection, string> = {
  horizontal: 'h-4 w-3',
  vertical: 'h-3 w-4',
};

const baseGripIconClasses = 'size-2.5';

export function resizableClasses(
  config: ResizableConfig,
  _state?: ResizableState,
): ResizableClassSet {
  const { direction } = config;
  return {
    root: `${baseRootClasses} ${rootDirectionClasses[direction]}`,
    panel: basePanelClasses,
    handle: `${baseHandleClasses} ${handleDirectionClasses[direction]}`,
    grip: `${baseGripClasses} ${gripDirectionClasses[direction]}`,
    gripIcon: direction === 'horizontal' ? `${baseGripIconClasses} rotate-90` : baseGripIconClasses,
  };
}
