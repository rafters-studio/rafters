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
const gridClasses = 'w-full border-collapse';
const weekdayClasses = 'w-8 pb-1 text-xs font-normal text-muted-foreground';
const weekClasses = '';

// Day state variants are driven off the data-* the score projects (data-today,
// data-selected, data-in-range, data-outside, data-disabled) -- no conditional
// class assembly, so the three decorators and the bind paint identically. Motion
// is intentionally undeclared: no semantic motion token fits a calendar day yet
// (the token layer is being rebuilt, #1899/#1902); see calendar.md.
const dayClasses =
  'relative inline-flex items-center justify-center size-8 rounded-md text-sm select-none ' +
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
