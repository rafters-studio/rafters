/**
 * WC performance for calendar. The score AND the DOM-native binding
 * (bindCalendar) live in calendar.behavior.ts, shared with the Astro
 * performance; this file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A calendar has no meaningful author-provided content -- the grid is entirely
 * generated -- so this light-DOM enhancer scaffolds the structural parts (header
 * controls, heading, the table with its weekday row and an empty tbody) with the
 * view's classes, copies the element's configuration onto the root as the
 * `data-*` the bind reads, then hands the root to bindCalendar, which fills the
 * tbody, the heading text, and every ARIA projection. Structure + decoration
 * here; all behavior in the shared bind. The bind is deferred one microtask
 * because connectedCallback can fire before attributes settle (gotcha #3).
 */
import {
  bindCalendar,
  calendarBehavior,
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
    const mode = (attr('mode') as CalendarMode | null) ?? 'single';
    const weekStartsOn = coerceWeekStart(attr('week-starts-on'));

    // A minimal config for the VIEW only (classes read nothing stateful today);
    // the behavioral config is reconstructed by the bind from the data-* below.
    const config: CalendarConfig = {
      mode,
      showOutsideDays: attr('show-outside-days') !== 'false',
      fixedWeeks: attr('fixed-weeks') === 'true',
      weekStartsOn,
      today: attr('today') ?? '',
    };
    const classes = calendarClasses(config, calendarBehavior.initialState({ ...config }));

    const base = this.id || `calendar-${++idCounter}`;
    const ids = {} as Record<CalendarPart, string>;
    for (const part of Object.keys(calendarBehavior.parts) as CalendarPart[]) {
      ids[part] = `${base}-${part}`;
    }

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    root.className = classes.root;
    // The config the bind reads back (readConfig): copy each element attribute
    // to its data-* twin so the bind's uncontrolled seed matches this markup.
    root.dataset['mode'] = mode;
    if (attr('selected')) root.dataset['selected'] = attr('selected') as string;
    if (attr('default-month')) root.dataset['month'] = attr('default-month') as string;
    if (attr('from-date')) root.dataset['fromDate'] = attr('from-date') as string;
    if (attr('to-date')) root.dataset['toDate'] = attr('to-date') as string;
    root.dataset['showOutsideDays'] = String(config.showOutsideDays);
    root.dataset['fixedWeeks'] = String(config.fixedWeeks);
    root.dataset['weekStartsOn'] = String(weekStartsOn);
    if (attr('today')) root.dataset['today'] = attr('today') as string;

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
