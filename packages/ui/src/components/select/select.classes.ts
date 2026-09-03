import type { SelectConfig, SelectState } from './select.behavior';

export interface SelectClassSet {
  trigger: string;
  value: string;
  chevron: string;
  content: string;
  viewport: string;
  item: string;
  itemIndicator: string;
  itemText: string;
  group: string;
  label: string;
  separator: string;
  scrollButton: string;
  scrollIcon: string;
}

// Touch floor at h-11, scaling down via the container query (repo CQ
// convention) rather than the viewport. Fill, not background.
//
// THE ROW: select / trigger / hover -- color, duration-fast, ease-standard
// (motion.md:250). It governs the `hover:border-input-hover` change below, which
// until now was not transitioned at all: the class carried `transition-shadow`
// only, so the border snapped. A transition, not a keyframe (`select | trigger |
// hover`, EXCLUDED_ROWS.noIntersectingProperty in
// packages/design-tokens/test/motion-cells.test.ts).
//
// THE ONE PLACE TWO MOMENTS COLLIDE, and it is a finding, not a preference.
// `transition-duration` is per ELEMENT, not per property: two `duration-*`
// utilities on one class both write the longhand and the later-sorted one wins
// for every property in the list. So the ring and the border cannot hold
// different tiers here with plain utilities, and one of them has to give.
//
// THE ROW WINS AND THE ANALOGY GIVES. The previous `duration-micro` was never an
// assignment -- this file's own comment recorded it as borrowed from input /
// root / focus (motion.md:266) because "motion.jsonl has no select | trigger |
// focus cell to source that from directly". `duration-fast ease-standard` IS an
// assignment, on the row this issue transcribes, so the ring now runs at the
// hover tier one band slower. Written down here rather than hidden: what select
// actually needs is its own `trigger | focus` row, which is matrix hygiene
// (#2158/#2159) and not a change this file may make. The property list is spelled
// out rather than left to `transition-colors`, which would have dropped
// box-shadow from the list entirely and killed the ring's transition outright.
//
// NO component-level reduced-motion escape here or on the chevron below. The
// pre-existing `motion-reduce:transition-none` on both is REMOVED: the
// generated `duration-*` and `delay-*` utilities zero themselves under
// prefers-reduced-motion (REDUCED_MOTION_ZEROED,
// packages/design-tokens/src/exporters/tailwind.ts), so reduced motion is the
// token sheet's responsibility and never a component-level media query
// (tooltip.classes.ts states the rule).
const triggerClasses =
  'group flex h-11 @md:h-9 w-full items-center justify-between gap-2 rounded-md ' +
  'border border-input bg-background px-3 py-2 text-body-small ts-body-small shadow-sm ring-offset-background ' +
  'transition-[box-shadow,color,background-color,border-color] duration-fast ease-standard ' +
  'hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

// The selected label / placeholder. Placeholder look keys off data-empty,
// toggled by the binding when nothing is selected.
const valueClasses = 'pointer-events-none truncate text-left data-[empty]:text-muted-foreground';

// THE ROW: select / chevron / open <-> closed -- rotate, duration-moderate,
// ease-standard, extent structural (motion.md:191). The 180deg is mechanics, not
// tuning, which is why the matrix marks the extent structural and no
// `extent-*` generic appears. `ease-standard` is what this fix adds; the tier
// was already named. A transition on a part that stays put, so it is excluded
// from the cell vocabulary by name (`select | chevron | open <-> closed`,
// EXCLUDED_ROWS.noIntersectingProperty).
const chevronClasses =
  'size-4 shrink-0 opacity-50 transition-transform duration-moderate ease-standard ' +
  'group-data-[state=open]:rotate-180';

// THE CELL IS THE SPEC. These two utilities are the generated consumption of
// select / content / closed -> open (moderate, enter, extent pop) and
// open -> closed (fast, exit, extent pop) -- motion.md:186-187, emitted as
// `select-content-open` / `-close` in DEFAULT_MOTION_CELL_ANIMATIONS. They
// replace `animate-in` / `animate-out` / `fade-in-0` / `zoom-in-95`, the
// tailwindcss-animate vocabulary: that plugin is not a dependency of this repo,
// so those five classes compiled to nothing and select's content has not
// animated at all. popover.classes.test.ts pins their absence for the same
// reason.
//
// NO motion-reduce:animate-none -- the generated utility zeroes
// animation-duration under the media query, keeping the keyframe's end state.
//
// ONE KNOWN LIMIT, reported not papered over: the exit keyframe cannot run
// today. The content carries `hidden` off the open flag (select.tsx:373,
// select.astro:136) with no presence layer holding it, so the panel goes
// display:none the instant it closes. Enter is unaffected -- an element leaving
// display:none starts its animation exactly as a mounting one does, which is why
// no @starting-style appears here. dropdown-menu shows the fix (usePresence
// gating `hidden`, dropdown-menu.tsx:288-290); it is a view-layer change.
const contentClasses =
  'z-depth-dropdown max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover ' +
  'text-popover-foreground shadow-md ' +
  'data-[state=open]:animate-scale-in-moderate-enter ' +
  'data-[state=closed]:animate-scale-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

const viewportClasses = 'p-1';

// THE ROW: select / items / highlight move -- color, duration-micro,
// ease-standard (motion.md:189), PROPOSED and unreviewed, transcribed as
// written. A transition, not a keyframe (`select | items | highlight move`,
// EXCLUDED_ROWS.noIntersectingProperty).
//
// `group/item` is NAMED so the indicator below reads this item's `data-state`
// and nothing else: the trigger above is already a bare `group` (for the
// chevron) and a second unnamed scope would make the two selectors ambiguous.
//
// THE SECOND ROW: select / items / enter -- fade (with content), which assigns
// `delay-stagger-step` and no duration and no curve (motion.jsonl:55).
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
  'focus:bg-accent focus:text-accent-foreground ' +
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

// THE ROW: select / items / selected check -- swap (discrete state change),
// duration-micro, ease-standard (motion.md:190), PROPOSED and unreviewed. The
// swap rides opacity on the always-present indicator BOX rather than on the
// check glyph, which the React view mounts and unmounts (select.tsx:448-452): a
// mounting node has no previous opacity to transition from, and the box does.
// `data-state` is `checked`/`unchecked` on the item (selectItemAria,
// select.behavior.ts:238), so the swap is pure CSS. At a micro tier this reads
// as the near-instant swap the movement vocabulary describes, and at zero it is
// an instant one -- a legitimate personality.
const itemIndicatorClasses =
  'absolute left-2 flex h-3.5 w-3.5 items-center justify-center ' +
  'opacity-0 transition-opacity duration-micro ease-standard ' +
  'group-data-[state=checked]/item:opacity-100';

const itemTextClasses = 'truncate';

const groupClasses = 'p-1';

const labelClasses = 'py-1.5 pl-8 pr-2 text-label-medium ts-label-medium text-muted-foreground';

const separatorClasses = '-mx-1 my-1 h-px bg-muted';

const scrollButtonClasses = 'flex cursor-default items-center justify-center py-1';

const scrollIconClasses = 'size-4';

export function selectClasses(_config: SelectConfig, _state: SelectState): SelectClassSet {
  return {
    trigger: triggerClasses,
    value: valueClasses,
    chevron: chevronClasses,
    content: contentClasses,
    viewport: viewportClasses,
    item: itemClasses,
    itemIndicator: itemIndicatorClasses,
    itemText: itemTextClasses,
    group: groupClasses,
    label: labelClasses,
    separator: separatorClasses,
    scrollButton: scrollButtonClasses,
    scrollIcon: scrollIconClasses,
  };
}
