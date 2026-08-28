import type { ContextMenuConfig, ContextMenuState } from './context-menu.behavior';

/**
 * The view for context-menu: class strings only, no logic. Motion rides the
 * semantic motion tokens (Spec 05): the content enters on `motion-dropdown-in`
 * (fade + zoom, the dropdown tier), and item highlight rides `motion-focus`.
 * No raw numeric durations or hand-picked easings -- the tokens encode timing,
 * curve, and the prefers-reduced-motion degradation. Fill, not background:
 * bg-popover/text-popover-foreground are the popover surface tokens; the depth
 * token (z-depth-dropdown) replaces a raw z-index.
 *
 * Exit motion (`motion-dropdown-out`) is intentionally NOT declared: the content
 * toggles `hidden` when closed, so the exiting node leaves the box model before
 * an out transition can play. A played exit awaits the Presence layer (Spec 04);
 * declaring it now would be a silent no-op.
 */
export interface ContextMenuClassSet {
  trigger: string;
  content: string;
  subContent: string;
  item: string;
  checkboxItem: string;
  radioItem: string;
  subTrigger: string;
  subTriggerChevron: string;
  itemIndicator: string;
  checkIcon: string;
  radioDot: string;
  label: string;
  separator: string;
  shortcut: string;
  group: string;
}

const trigger = 'inline-block';

const content =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg outline-none ' +
  'motion-dropdown-in opacity-0 scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100';

// The submenu panel shares its surface chrome with `content` but NOT its
// motion: `content` is out of scope for #2152 (the parent menu's open/close
// cells are a later component-sweep item, #2017's CHANGELOG), while
// `subContent` consumes the two rows #2151 added to motion.jsonl -- context-menu
// / subcontent / "closed -> open" (moderate, enter, delay hover-intent) and
// "open -> closed" (fast, exit, no delay) -- entirely as CSS/tokens. No
// TypeScript reads a motion token and no timer implements the hover-intent
// delay (#2152): `bindContextSubMenu`/`ContextMenuSub` dispatch `open`/`close`
// the instant a pointer event fires, and `transition-delay` on the reveal rule
// is what makes that state change invisible for the hover-intent window.
//
// No extent-pop/scale: the cell's movement is "fade + zoom", but the zoom
// half has no consumer here, matching tooltip/hover-card content (#2148),
// which declare the identical extent-pop cell and also implement fade only.
// Consuming extent-pop as a transform requires a Tailwind arbitrary value that
// names the exporter's `--rafters-consumed-extent` alias directly, which the
// repo's "consumers never reference --rafters-* vars directly" rule forbids in
// component source; no generated utility bridges a custom property into
// `scale-*` today. The gap is pre-existing and shared with every other
// hover-triggered surface, not introduced here.
//
// THE CLOSED cell is the base rule (duration-fast ease-exit, no delay) and the
// OPEN cell is the reveal rule, exactly as tooltip/hover-card content already
// do (#2148): whichever rule currently applies owns the duration/curve/delay
// of the transition INTO it.
//
// TWO independent ways into the open rule, because sub-content moves at
// runtime. `context-menu-sub.astro`'s authored markup has sub-content as a
// real DOM sibling of sub-trigger under `[data-part="sub"]`, so the `:hover` /
// `:focus-within` selector below reveals it with NO JavaScript at all -- the
// no-JS floor. Once `bindContextSubMenu` (or React's `ContextMenuSub`) runs,
// sub-content is moved to `document.body` (escaping the parent's
// `overflow-hidden` and its roving-focus scope) or portalled, which breaks
// that DOM adjacency, so the `:hover` selector can no longer match it. From
// then on `data-[state=open]` -- flipped by the same pointerenter/pointerleave
// listeners, plus keyboard (ArrowRight/ArrowLeft/Escape) -- is the ONLY
// reachable path, and it carries the identical duration/curve/delay: the
// matrix's cell governs the transition regardless of which input opened it,
// so no keyboard-instant exception is invented here (contrast tooltip/
// hover-card, whose data-state path deliberately drops delay-hover-intent for
// a forced/keyboard open -- their content never moves, so that path races the
// live `:hover` rule; here it never does, so there is nothing to race).
//
// No `data-dismissed` escape hatch: tooltip/hover-card need one because their
// content stays a real sibling under `:hover`, so an Escape-dismissed panel
// could otherwise be pulled back open by a pointer that never left. Once
// sub-content is detached, its `:hover` rule is permanently unreachable, so an
// Escape close (`data-state` flips to closed) cannot be reopened by a
// still-hovering pointer -- the race that hatch exists for cannot occur here.
//
// `pointer-events` rides the transition (`transition-discrete`) rather than
// toggling with `hidden`: the panel is now unconditionally in the render tree
// (no `hidden`/display:none -- a hidden node cannot transition), so an inert,
// invisible fixed-position box must not still intercept clicks while closed.
// NOTE: every `[:is(...)>&]:<utility>` candidate below is spelled out in full,
// never built by interpolating a shared prefix variable into a template
// literal. Tailwind's oxide scanner extracts candidates from the SOURCE TEXT
// of this file, not from the evaluated runtime string -- an interpolation
// leaves the literal characters `${...}` in the file and the resolved
// candidate exists nowhere in the source Tailwind actually reads, so it
// compiles to nothing (silently; verified against the real Tailwind CLI in
// `test/motion/reveal-candidates.test.ts`, which is the whole reason that
// suite scans the real component directories rather than a fixture built from
// the evaluated strings).
const subContent =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg outline-none ' +
  'opacity-0 pointer-events-none transition-[opacity,pointer-events] transition-discrete ' +
  'duration-fast ease-exit ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:opacity-100 ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:pointer-events-auto ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:transition-opacity ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:duration-moderate ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:ease-enter ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:delay-hover-intent ' +
  'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:transition-opacity ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter data-[state=open]:delay-hover-intent';

const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small ts-body-small outline-none ' +
  'motion-focus focus:bg-accent focus:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const item = `${itemBase} gap-2 px-2 py-1.5`;

const checkboxItem = `${itemBase} py-1.5 pl-8 pr-2`;

const radioItem = `${itemBase} py-1.5 pl-8 pr-2`;

// The sub-trigger is a menuitem that also stays highlighted while its submenu is
// open (data-[state=open]).
const subTrigger = `${itemBase} gap-2 px-2 py-1.5 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground`;

const subTriggerChevron = 'ml-auto h-4 w-4';

const itemIndicator = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';

const checkIcon = 'h-4 w-4';

const radioDot = 'h-2 w-2 rounded-full bg-current';

const label = 'px-2 py-1.5 text-label-medium ts-label-medium';

const separator = '-mx-1 my-1 h-px border-0 bg-muted';

const shortcut = 'ml-auto text-shortcut ts-shortcut opacity-60';

const group = '';

export function contextMenuClasses(
  _config: ContextMenuConfig,
  _state: ContextMenuState,
): ContextMenuClassSet {
  return {
    trigger,
    content,
    subContent,
    item,
    checkboxItem,
    radioItem,
    subTrigger,
    subTriggerChevron,
    itemIndicator,
    checkIcon,
    radioDot,
    label,
    separator,
    shortcut,
    group,
  };
}
