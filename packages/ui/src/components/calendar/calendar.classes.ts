import type { CalendarConfig, CalendarState } from './calendar.behavior';

export interface CalendarClassSet {
  /** The outer container. */
  root: string;
  /** The month-navigation header row (prev / heading / next). */
  header: string;
  /** The prev and next month controls (same affordance). */
  nav: string;
  /** The month/year label. */
  heading: string;
  /** The [role="grid"] table. */
  grid: string;
  /** A weekday-header cell. */
  weekday: string;
  /** A week row. */
  week: string;
  /** A day gridcell: state variants ride the data-* the score projects. */
  day: string;
}

const rootClasses = 'inline-block p-3';
const headerClasses = 'flex items-center justify-between pb-4';
const navClasses =
  'inline-flex items-center justify-center size-7 rounded-md ' +
  'text-foreground hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const headingClasses = 'text-sm font-medium';
// GRID / MONTH CHANGE -- "fade or slide (x) crossfade" at duration-moderate,
// ease-standard, marked `proposed` (unreviewed) in motion.jsonl. The month grid
// is replaced wholesale rather than moved, so the cell is a keyframe, and the
// token layer already picked the shape: the `calendar-grid-month-change` cell
// animation is keyframe `fade-in` at moderate/standard, emitted as
// `animate-fade-in-moderate-standard`.
//
// KNOWN GAP, reported rather than papered over: the keyframe fires when the
// grid NODE is created, and the grid node outlives a month change in both
// performances -- calendar.tsx renders one unkeyed `<table data-part="grid">`
// and `bindCalendar`'s `renderDays` rebuilds only the tbody beneath it. So this
// plays on mount and not again until the grid is keyed by the visible month,
// which lives in calendar.tsx / calendar.behavior.ts, not in this file.
const gridClasses = 'w-full border-collapse animate-fade-in-moderate-standard';
const weekdayClasses = 'w-8 pb-1 text-xs font-normal text-muted-foreground';
const weekClasses = '';

// Day state variants are driven off the data-* the score projects (data-today,
// data-selected, data-in-range, data-outside, data-disabled) -- no conditional
// class assembly, so the three decorators and the bind paint identically.
//
// DAY CELL / HOVER -- "color" (background, text, border) at duration-fast,
// ease-standard. `transition-colors` is exactly that property set.
//
// DAY CELL / SELECTED <-> UNSELECTED -- "swap + color" at duration-micro,
// ease-standard, marked `proposed` (unreviewed). Both rows animate the same
// properties on the same element at different tiers, and CSS gives one duration
// per applying rule, so the base carries hover's `fast` and the selected rule
// scopes `micro`. The consequence, recorded rather than hidden: selecting runs
// at micro and deselecting settles at fast -- the "whichever rule you transition
// INTO owns the timing" convention context-menu records, applied to a pair of
// rows that disagree about the tier rather than to one row's two directions.
// Only `duration-*` is scoped; the transition-property utility is declared once
// on the base so it can never sort after a duration (see button.classes.ts).
//
// RANGE / RANGE CHANGE -- reported, not faked. The row assigns "fill (span
// spread)" over `inline-size / width` to a `range` part; this calendar has no
// spanning range element whose width changes. A range is painted per day cell
// as a background (`data-[in-range=true]:bg-accent`), so the moment the row
// describes does not exist here. The colour half of that paint rides the hover
// transition above; nothing animates an inline-size, because nothing changes one.
const dayClasses =
  'relative inline-flex items-center justify-center size-8 rounded-md text-sm select-none ' +
  'transition-colors duration-fast ease-standard data-[selected=true]:duration-micro ' +
  'cursor-pointer text-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'data-[in-range=true]:bg-accent data-[in-range=true]:text-accent-foreground ' +
  'data-[today=true]:bg-accent data-[today=true]:font-semibold data-[today=true]:text-accent-foreground ' +
  'data-[outside=true]:text-muted-foreground data-[outside=true]:opacity-50 data-[outside=true]:cursor-default ' +
  'data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:pointer-events-none ' +
  'data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground ' +
  'data-[selected=true]:hover:bg-primary data-[selected=true]:hover:text-primary-foreground';

/** The view: class strings keyed by config/state. No logic. */
export function calendarClasses(_config: CalendarConfig, _state: CalendarState): CalendarClassSet {
  return {
    root: rootClasses,
    header: headerClasses,
    nav: navClasses,
    heading: headingClasses,
    grid: gridClasses,
    weekday: weekdayClasses,
    week: weekClasses,
    day: dayClasses,
  };
}
