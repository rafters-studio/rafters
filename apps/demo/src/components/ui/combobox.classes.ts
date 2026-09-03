import type { ComboboxConfig, ComboboxState } from '@/components/ui/combobox.behavior';

export interface ComboboxClassSet {
  root: string;
  field: string;
  input: string;
  trigger: string;
  chevron: string;
  content: string;
  item: string;
  itemIndicator: string;
  itemText: string;
  empty: string;
  group: string;
  groupLabel: string;
  separator: string;
}

// `group` scopes the chevron's open-state rotation to the root's data-state.
const rootClasses = 'group';

// The positioning context for the toggle chevron, which sits absolutely inside.
const fieldClasses = 'relative w-full';

// Touch floor at h-11, scaling down via the container query (repo CQ
// convention). Right padding leaves room for the chevron. Fill, not background.
//
// TWO MOMENTS WITH NO ROW, reported rather than assigned a tier this file would
// have to invent: the ring's `transition-shadow` here, and the chevron's
// `transition-transform` below. motion.jsonl gives combobox four rows only --
// content open/close and items enter/highlight/selected -- and nothing for a
// combobox trigger, focus ring, or chevron, even though select carries both a
// `trigger | hover` and a `chevron | open <-> closed` row for the same two
// moments (motion.md:191, 250). Both therefore still fall through to Tailwind's
// built-in 150ms, which is the #1955 trap in its quiet form: no literal appears
// in this file, and a literal is what runs. Adding the rows is matrix hygiene
// (#2158/#2159), not a transcription this issue can make.
const inputClasses =
  'flex h-11 @md:h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 ' +
  'text-body-small ts-body-small shadow-sm ring-offset-background transition-shadow motion-reduce:transition-none ' +
  'placeholder:text-muted-foreground hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

const triggerClasses =
  'absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground';

const chevronClasses =
  'size-4 shrink-0 opacity-50 transition-transform motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

// THE CELL IS THE SPEC. These two utilities are the generated consumption of
// combobox / content / closed -> open (moderate, enter, extent pop) and
// open -> closed (fast, exit, extent pop) -- motion.md:192-193, emitted as
// `combobox-content-open` / `-close` in DEFAULT_MOTION_CELL_ANIMATIONS. The
// comment they replace said the semantic `motion-dropdown-in/-out` tokens were
// "documented but not yet generated"; those thirteen tokens were deleted by
// ruling (2026-08-02) and the cells above are what the matrix assigns instead.
// `data-state` reaches this element from `comboboxAria(...).content`
// (combobox.behavior.ts:211), spread by both the React and Astro views.
//
// NO motion-reduce:animate-none -- the generated utility zeroes
// animation-duration under the media query, which keeps the keyframe's end
// state; `animation: none` would discard that zero wherever it wins.
//
// ONE KNOWN LIMIT, reported not papered over: the exit keyframe cannot run
// today. The content carries `hidden` off the same open flag (combobox.tsx:329,
// combobox.astro:135) with no presence layer holding it, so the panel goes
// display:none the instant it closes and the closed cell never gets a frame.
// Enter is unaffected -- an element LEAVING display:none starts its animation
// exactly as a mounting one does, which is why no @starting-style appears here.
// dropdown-menu shows the fix (usePresence gating `hidden`,
// dropdown-menu.tsx:288-290); it belongs to the view layer, not this file.
const contentClasses =
  'z-depth-dropdown max-h-60 min-w-32 overflow-auto rounded-md border bg-popover p-1 ' +
  'text-popover-foreground shadow-md ' +
  'data-[state=open]:animate-scale-in-moderate-enter ' +
  'data-[state=closed]:animate-scale-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

// THE ROW: combobox / items / highlight move -- color, duration-micro,
// ease-standard (motion.md:195), PROPOSED and unreviewed, transcribed as
// written. A transition, not a keyframe (`combobox | items | highlight move`,
// EXCLUDED_ROWS.noIntersectingProperty in
// packages/design-tokens/test/motion-cells.test.ts).
//
// `group/item` is NAMED rather than bare so the indicator below reads this
// item's `data-state` and nothing else: the combobox root is already a bare
// `group` (for the chevron's rotation) and a second unnamed scope here would
// make the two selectors ambiguous.
//
// THE SECOND ROW: combobox / items / enter -- fade (with content), which
// assigns `delay-stagger-step` and no duration and no curve (motion.jsonl:61).
// `duration: {"kind":"none"}` means no DURATION is assigned, not that nothing
// is: the delay generic is the entire assignment, and naming it is the whole
// consumption. The fade is the content keyframe's; this class carries only the
// offset, which resolves to 0ms at the efficient intent. Zero is the
// assignment, not a gap -- see dropdown-menu's items class for the full note,
// including the per-element `transition-delay` coupling with the row above.
const itemClasses =
  'group/item relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 ' +
  'text-body-small ts-body-small outline-none ' +
  'transition-colors duration-micro ease-standard delay-stagger-step ' +
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

// THE ROW: combobox / items / selected check -- swap (discrete state change),
// duration-micro, ease-standard (motion.md:196), PROPOSED and unreviewed. The
// swap rides opacity on the always-present indicator BOX rather than on the
// check glyph, which the views mount and unmount (combobox.tsx:419-423): a
// mounting node has no previous opacity to transition from, and the box does.
// `data-state` is `checked`/`unchecked` on the item
// (comboboxItemAria, combobox.behavior.ts:250), so the swap is pure CSS.
// At a micro tier this reads as the near-instant swap the movement vocabulary
// describes, and at zero it is an instant one -- a legitimate personality.
const itemIndicatorClasses =
  'absolute left-2 flex size-3.5 items-center justify-center ' +
  'opacity-0 transition-opacity duration-micro ease-standard ' +
  'group-data-[state=checked]/item:opacity-100';

const itemTextClasses = 'truncate';

const emptyClasses = 'py-6 text-center text-body-small ts-body-small text-muted-foreground';

const groupClasses = 'overflow-hidden p-1';

const groupLabelClasses = 'px-2 py-1.5 text-label-medium ts-label-medium text-muted-foreground';

const separatorClasses = '-mx-1 my-1 h-px bg-muted';

export function comboboxClasses(_config: ComboboxConfig, _state: ComboboxState): ComboboxClassSet {
  return {
    root: rootClasses,
    field: fieldClasses,
    input: inputClasses,
    trigger: triggerClasses,
    chevron: chevronClasses,
    content: contentClasses,
    item: itemClasses,
    itemIndicator: itemIndicatorClasses,
    itemText: itemTextClasses,
    empty: emptyClasses,
    group: groupClasses,
    groupLabel: groupLabelClasses,
    separator: separatorClasses,
  };
}
