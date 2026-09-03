import type { ContextMenuConfig, ContextMenuState } from '@/components/ui/context-menu.behavior';

/**
 * The view for context-menu: class strings only, no logic. Motion is CSS: the
 * content runs the two anchored-popup CELLS keyed off `data-state`, and every
 * other moment names duration/curve generics. Fill, not background:
 * bg-popover/text-popover-foreground are the popover surface tokens; the depth
 * token (z-depth-dropdown) replaces a raw z-index.
 *
 * THE THIRTEEN SEMANTIC MOTION CLASSES ARE GONE (ruling 2026-08-02). This file
 * used to name two of them -- `motion-dropdown-in` on `content` and
 * `motion-focus` on `itemBase` -- which compiled only because nothing failed on
 * an unknown class. Both are replaced below by what their matrix rows assign.
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

// THE CELL IS THE SPEC. These two utilities are the generated consumption of
// context-menu / content / closed -> open (moderate, enter, extent pop) and
// open -> closed (fast, exit, extent pop) -- motion.md:173-174, emitted as
// `context-menu-content-open` / `-close` in DEFAULT_MOTION_CELL_ANIMATIONS.
// They replace `motion-dropdown-in` plus a hand-rolled `opacity-0 scale-95`
// reveal: the retired semantic class named no tier the matrix assigns, and the
// hand-rolled pair is the tailwindcss-animate-shaped form this repo's own
// popover/dropdown-menu classes already prohibit.
//
// NO motion-reduce:animate-none. The generated utility zeroes
// animation-duration under prefers-reduced-motion, which keeps the keyframe's
// end state; `animation: none` resets the shorthand and discards that zero.
//
// ONE KNOWN LIMIT, reported not papered over: the exit keyframe cannot run
// today. `contextMenu.aria(...).content` projects `hidden` off the same
// open flag (context-menu.behavior.ts:105) and ContextMenuContent spreads it
// AFTER presence's own props (context-menu.tsx:297), so the panel goes
// display:none the instant it closes and the closed cell never gets a frame.
// dropdown-menu solved this by keeping `hidden` off `aria.content` and gating
// it on `present` instead (dropdown-menu.tsx:288-290). The fix belongs to the
// behavior/view layer, not to this file; the class is correct and starts
// running the moment that wiring lands.
const content =
  'z-depth-dropdown min-w-32 overflow-hidden rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:animate-scale-in-moderate-enter ' +
  'data-[state=closed]:animate-scale-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

// The submenu panel shares its surface chrome with `content` but NOT its
// motion, and the two arrive by different mechanisms: `content` above runs the
// anchored-popup KEYFRAME cells (the component-sweep item #2152 deferred, done
// now), while `subContent` consumes the two rows #2151 added to motion.jsonl
// as TRANSITION generics -- context-menu
// / subcontent / "closed -> open" (moderate, enter, delay hover-intent) and
// "open -> closed" (fast, exit, no delay) -- entirely as CSS/tokens. No
// TypeScript reads a motion token and no timer implements the hover-intent
// delay (#2152): `bindContextSubMenu`/`ContextMenuSub` dispatch `open`/`close`
// the instant a pointer event fires, and `transition-delay` on the reveal rule
// is what makes that state change invisible for the hover-intent window.
//
// The cell's movement is "fade + zoom", and the zoom half rides `extent-pop`
// (packages/design-tokens/src/exporters/tailwind.ts, MOTION_NAMESPACE_PROPERTY
// .extent): the `extent-pop` class picks the member (writing the
// `--rafters-consumed-extent` alias) and `scale-(--rafters-consumed-extent)`
// -- Tailwind v4's CSS-variable-shorthand form of the arbitrary `scale`
// utility -- reads that alias back, never the leaf token. Neither candidate
// spells the wrapping function call this repo's authoring rule forbids
// (consumers never write that call around a `--rafters-*` name directly), so
// the alias's NAME is referenced, its value never is. Confirmed compiling
// against the real Tailwind CLI (`test/motion/reveal-candidates.test.ts`),
// which is the whole reason that suite exists rather than trusting the
// string. tooltip/hover-card content (#2148) declare the identical extent-pop
// cell and implement fade only -- a pre-existing gap this file does not
// inherit, because the shorthand form was untried there, not because it does
// not work.
//
// THE CLOSED cell is the base rule (duration-fast ease-exit, no delay) and the
// OPEN cell is the reveal rule, exactly as tooltip/hover-card content already
// do (#2148): whichever rule currently applies owns the duration/curve/delay
// of the transition INTO it.
//
// TWO independent ways into the open rule, because sub-content moves at
// runtime. `context-menu-sub.astro`'s authored markup has sub-content as a
// real DOM sibling of sub-trigger under `[data-part="sub"]`, so the `:hover` /
// `:focus-within` selector below reveals it purely through native CSS, no
// `setTimeout` or other script deciding WHEN -- not a no-JS floor (spec
// correction 2026-08-28: a context menu opens on the `contextmenu` event,
// which requires script by construction, so nothing renders for that
// guarantee to protect). Once `bindContextSubMenu` (or React's `ContextMenuSub`) runs,
// sub-content is moved to `document.body` (escaping the parent's
// `overflow-hidden` and its roving-focus scope) or portalled, which breaks
// that DOM adjacency, so the `:hover` selector can no longer match it. From
// then on `data-[state=open]` -- flipped by the same pointerenter/pointerleave
// listeners, plus keyboard (ArrowRight/ArrowLeft/Escape) and click -- is the
// ONLY reachable path. Unlike tooltip/hover-card (#2148), that single path is
// not uniformly delayed OR uniformly instant: a genuine pointer hover still
// needs the hover-intent filter (accidental transit should not pop a
// submenu), but a click or keyboard open has already declared intent and
// must be instant -- WAI-ARIA menu keyboard, and the issue's own acceptance
// criterion that keyboard navigation is unchanged. `data-open-source` is the
// disambiguator: `bindContextSubMenu`/`ContextMenuSub` dispatch `open` with a
// `'pointer'` or `'discrete'` payload (context-menu.behavior.ts), the score
// projects it straight onto `subContent`, and this is a plain input-source
// MARK, not a timing decision -- the CSS below still owns every duration,
// curve, and delay. `data-[state=open]:data-[open-source=pointer]:` scopes
// `delay-hover-intent` to that mark; click and keyboard opens carry
// `data-open-source="discrete"` instead (never `"pointer"`, so the scoped
// selector above never matches them) and so resolve through the un-delayed
// `data-[state=open]:duration-moderate`/`ease-enter` pair a few lines below,
// with no reveal delay whatsoever (contrast tooltip/hover-card, whose
// data-state path drops delay-hover-intent for a forced/keyboard open because
// their content never moves and that path would otherwise race the live
// `:hover` rule; here it never does, so there is nothing to race -- the
// pointer/discrete split exists for the hover-intent filter itself, not to
// avoid a race).
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
  'opacity-0 pointer-events-none extent-pop scale-(--rafters-consumed-extent) ' +
  'transition-[opacity,scale,pointer-events] transition-discrete ' +
  'duration-fast ease-exit ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:opacity-100 ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:scale-100 ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:pointer-events-auto ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:transition-[opacity,scale] ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:duration-moderate ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:ease-enter ' +
  '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]:delay-hover-intent ' +
  'data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:transition-[opacity,scale] ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter ' +
  'data-[state=open]:data-[open-source=pointer]:delay-hover-intent';

// THE ROW: context-menu / items / highlight move -- color, duration-micro,
// ease-standard (motion.md:176), marked PROPOSED and unreviewed, transcribed as
// written. It replaces the retired `motion-focus` semantic class, which named
// no tier this matrix assigns. A transition, not a keyframe -- the item stays
// put -- so it is excluded from the cell vocabulary by name (`context-menu |
// items | highlight move`, EXCLUDED_ROWS.noIntersectingProperty in
// packages/design-tokens/test/motion-cells.test.ts).
//
// THE SECOND ROW: context-menu / items / enter -- fade (with content), which
// assigns `delay-stagger-step` and no duration and no curve (motion.jsonl:42).
// `duration: {"kind":"none"}` means no DURATION is assigned, not that nothing
// is: the delay generic is the entire assignment, and naming it is the whole
// consumption. The fade is the content keyframe's; this class carries only the
// offset, which resolves to 0ms at the efficient intent. Zero is the
// assignment, not a gap -- see dropdown-menu's items class for the full note,
// including the per-element `transition-delay` coupling with the row above.
const itemBase =
  'relative flex cursor-default select-none items-center rounded-sm text-body-small ts-body-small outline-none ' +
  'transition-colors duration-micro ease-standard delay-stagger-step ' +
  'focus:bg-accent focus:text-accent-foreground ' +
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
