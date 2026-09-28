/**
 * DatePicker: a calendar in an anchored popup that selects a date for a form
 *
 * @cognitive-load 4/10 - decision 2, information 1, interaction 1, disruption 0,
 * learning 0. One decision (which date) plus the month to find it in; the closed
 * trigger shows a single value, the open popup is one month of dates; one click
 * opens and one click selects; the popup is non-modal and anchored, so the page
 * stays in view; the trigger-plus-calendar pattern is universally learned.
 * @attention-economics Closed, it costs what a text field costs: one line with the
 * committed date or a muted placeholder. Attention is spent only while the popup
 * is open, and the popup closes itself the moment the selection is complete.
 * @trust-building The trigger always shows what the form will submit; a single
 * date or a finished range closes the popup and returns focus to the trigger;
 * Escape and an outside click dismiss without changing the value.
 * @accessibility The trigger carries aria-haspopup="dialog", aria-expanded and
 * aria-controls; the popup is role="dialog" named by its trigger; focus moves to
 * the grid's single tabstop on open and back to the trigger on close; the grid
 * is calendar's role="grid" with full arrow/Home/End/PageUp/PageDown navigation;
 * the value submits through a hidden input.
 * @semantic-meaning Date entry for a form: scheduling, booking, filtering. Single
 * mode picks one date; range mode picks a start and an end.
 *
 * @usage-patterns
 * DO: Use for single date or date range selection inside a form
 * DO: Give the picker a name so the value submits with its form
 * DO: Provide a clear placeholder for the empty state
 * DO: Bound selectable dates with fromDate/toDate
 * NEVER: Use for time-only selection
 * NEVER: Require more than one click to select a single date
 * NEVER: Hide the selected value behind the popup
 *
 * @example
 * ```tsx
 * <DatePicker name="due" value={date} onValueChange={setDate} placeholder="Pick a date" />
 * ```
 */

/**
 * WC performance for date-picker. The score AND the DOM-native binding
 * (bindDatePicker) live in date-picker.behavior.ts, shared with the Astro
 * performance; this file only adapts that binding to the custom-element
 * lifecycle.
 *
 * The picker has no author-provided content, so this light-DOM enhancer
 * scaffolds its parts with the view's classes -- the trigger with its value
 * label and glyph, the popup, and the hidden form input when `name` is set --
 * and nests calendar's own element (`<rafters-calendar>`) in the popup, which
 * scaffolds and binds the grid itself. The element's attributes are copied onto
 * the root as the `data-*` the bind reads. The bind is deferred one microtask
 * because connectedCallback can fire before attributes settle (gotcha #3).
 */
import '../calendar/calendar.element';
import {
  bindDatePicker,
  datePicker,
  DEFAULT_PLACEHOLDER,
  formValueAttrs,
  type DatePickerConfig,
  type DatePickerMode,
} from './date-picker.behavior';
import { datePickerClasses } from './date-picker.classes';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Calendar attributes the picker forwards to its nested grid. */
const CALENDAR_ATTRIBUTES = [
  'today',
  'default-month',
  'from-date',
  'to-date',
  'week-starts-on',
  'show-outside-days',
  'fixed-weeks',
] as const;

let idCounter = 0;

function glyph(className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  for (const d of ['M8 2v4', 'M16 2v4', 'M3 10h18']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  const rect = document.createElementNS(SVG_NS, 'rect');
  for (const [name, value] of [
    ['width', '18'],
    ['height', '18'],
    ['x', '3'],
    ['y', '4'],
    ['rx', '2'],
  ] as const) {
    rect.setAttribute(name, value);
  }
  svg.appendChild(rect);
  return svg;
}

export class RaftersDatePicker extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.teardown = bindDatePicker(this.scaffold());
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private scaffold(): HTMLElement {
    const attr = (name: string): string | null => this.getAttribute(name);
    const mode: DatePickerMode = attr('mode') === 'range' ? 'range' : 'single';
    const value = attr('value') ?? '';
    const name = attr('name') ?? undefined;
    const disabled = this.hasAttribute('disabled');

    // A minimal config for the VIEW only; the bind reads the behavioral config
    // back from the data-* below.
    const config: DatePickerConfig = { mode, disabled };
    const classes = datePickerClasses(config, datePicker.initialState(config));

    const base = this.id ? `${this.id}-picker` : `date-picker-${++idCounter}`;

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.setAttribute('data-date-picker', '');
    root.dataset['pickerMode'] = mode;
    root.dataset['value'] = value;
    root.dataset['placeholder'] = attr('placeholder') ?? DEFAULT_PLACEHOLDER;
    root.dataset['disabled'] = String(disabled);
    root.dataset['defaultOpen'] = String(attr('default-open') === 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = `${base}-trigger`;
    trigger.setAttribute('data-part', 'trigger');
    trigger.className = classes.trigger;
    trigger.disabled = disabled;

    const label = document.createElement('span');
    label.id = `${base}-value`;
    label.setAttribute('data-part', 'value');
    label.className = classes.value;
    trigger.append(label, glyph(classes.icon));

    const content = document.createElement('div');
    content.id = `${base}-content`;
    content.setAttribute('data-part', 'content');
    content.tabIndex = -1;
    content.hidden = true;
    content.className = classes.content;

    const calendar = document.createElement('rafters-calendar');
    calendar.id = `${base}-calendar`;
    calendar.setAttribute('mode', mode);
    if (value) calendar.setAttribute('selected', value);
    for (const name of CALENDAR_ATTRIBUTES) {
      const forwarded = attr(name);
      if (forwarded !== null) calendar.setAttribute(name, forwarded);
    }
    content.appendChild(calendar);

    root.append(trigger, content);

    const hidden = formValueAttrs({ name, value });
    if (hidden) {
      const input = document.createElement('input');
      input.type = hidden.type;
      input.name = hidden.name;
      input.value = hidden.value;
      input.setAttribute('data-part', 'hidden-input');
      root.appendChild(input);
    }

    this.replaceChildren(root);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-date-picker')) {
  customElements.define('rafters-date-picker', RaftersDatePicker);
}
