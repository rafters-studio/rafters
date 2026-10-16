/**
 * Calendar component for date selection with month/year navigation
 *
 * @cognitive-load 5/10 - Familiar calendar grid pattern; requires spatial reasoning for date selection
 * @attention-economics Medium attention cost: visual scanning of date grid, navigation between months
 * @trust-building Clear today indicator, disabled date styling, keyboard navigation
 * @accessibility Full keyboard navigation, ARIA grid pattern, screen reader announcements
 * @semantic-meaning Date selection: scheduling, booking, date range picking
 *
 * @usage-patterns
 * DO: Use for single date or date range selection
 * DO: Clearly indicate today, selected dates, and disabled dates
 * DO: Support keyboard navigation (arrows, home, end, page up/down)
 * DO: Provide month/year navigation controls
 * DO: Disable dates outside valid range
 * NEVER: Use for time selection (use TimePicker)
 * NEVER: Hide navigation controls
 * NEVER: Allow selection of disabled dates
 *
 * @example
 * ```html
 * <rafters-calendar mode="single" selected="2026-07-10" default-month="2026-07-01">
 * </rafters-calendar>
 * ```
 */

/**
 * <rafters-calendar> -- the Web Component performance of the Calendar score.
 *
 * The score and the DOM-native binding (`bindCalendar`) live in
 * calendar.behavior.ts, shared with the Astro performance. This file adds the
 * view (calendar.classes.ts) and the custom-element wiring: in light DOM (the
 * date-picker finds the root and hears `calendarselect` through it) it renders
 * the tree calendar.tsx renders, copies the host's attributes onto the root as
 * the `data-*` the bind reads, and hands the root to `bindCalendar`, which fills
 * the tbody, the heading and every ARIA projection.
 *
 * Attributes: mode, selected (the seed), today, default-month, from-date,
 * to-date, week-starts-on, show-outside-days, fixed-weeks. A value outside an
 * enum falls back to the calendar.tsx default. The bind runs on the microtask
 * after connectedCallback (Gotcha 3) and its teardown runs on
 * disconnectedCallback. Each activation fires one `calendarselect`.
 */
import {
  bindCalendar,
  calendarBehavior,
  todayISO,
  weekdayHeaders,
  type CalendarConfig,
  type CalendarMode,
  type CalendarPart,
} from './calendar.behavior';
import { calendarClasses } from './calendar.classes';

let idCounter = 0;

function coerceWeekStart(raw: string | null): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Number(raw ?? 0);
  return (Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function coerceMode(raw: string | null): CalendarMode {
  return raw === 'multiple' || raw === 'range' ? raw : 'single';
}

export class RaftersCalendar extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.scaffold();
      this.teardown = bindCalendar(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private scaffold(): HTMLElement {
    const attr = (name: string): string | null => this.getAttribute(name);
    const mode = coerceMode(attr('mode'));
    const weekStartsOn = coerceWeekStart(attr('week-starts-on'));

    const config: CalendarConfig = {
      mode,
      showOutsideDays: attr('show-outside-days') !== 'false',
      fixedWeeks: attr('fixed-weeks') === 'true',
      weekStartsOn,
      today: attr('today') ?? todayISO(),
    };
    const classes = calendarClasses(config, calendarBehavior.initialState({ ...config }));

    const base = `rafters-calendar-${++idCounter}`;
    const ids = {} as Record<CalendarPart, string>;
    for (const part of Object.keys(calendarBehavior.parts) as CalendarPart[]) {
      ids[part] = `${base}-${part}`;
    }

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    root.className = classes.root;
    // The config the bind reads back (readConfig): each host attribute to its
    // data-* twin.
    root.dataset['mode'] = mode;
    const selected = attr('selected');
    if (selected) root.dataset['selected'] = selected;
    const month = attr('default-month');
    if (month) root.dataset['month'] = month;
    const fromDate = attr('from-date');
    if (fromDate) root.dataset['fromDate'] = fromDate;
    const toDate = attr('to-date');
    if (toDate) root.dataset['toDate'] = toDate;
    root.dataset['showOutsideDays'] = String(config.showOutsideDays);
    root.dataset['fixedWeeks'] = String(config.fixedWeeks);
    root.dataset['weekStartsOn'] = String(weekStartsOn);
    root.dataset['today'] = config.today;

    const header = document.createElement('div');
    header.setAttribute('data-part', 'header');
    header.className = classes.header;

    const chevron = (glyph: string): HTMLSpanElement => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = glyph;
      return span;
    };

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.setAttribute('data-part', 'prev');
    prev.id = ids.prev;
    prev.className = classes.nav;
    prev.appendChild(chevron('‹'));

    const heading = document.createElement('div');
    heading.setAttribute('data-part', 'heading');
    heading.id = ids.heading;
    heading.className = classes.heading;

    const next = document.createElement('button');
    next.type = 'button';
    next.setAttribute('data-part', 'next');
    next.id = ids.next;
    next.className = classes.nav;
    next.appendChild(chevron('›'));

    header.append(prev, heading, next);

    const table = document.createElement('table');
    table.setAttribute('data-part', 'grid');
    table.id = ids.grid;
    table.setAttribute('role', 'grid');
    table.className = classes.grid;
    table.dataset['dayClass'] = classes.day;

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const weekday of weekdayHeaders(weekStartsOn)) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = classes.weekday;
      th.textContent = weekday;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    table.appendChild(document.createElement('tbody'));

    root.append(header, table);
    this.replaceChildren(root);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-calendar')) {
  customElements.define('rafters-calendar', RaftersCalendar);
}
