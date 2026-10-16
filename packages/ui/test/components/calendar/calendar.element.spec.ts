/**
 * Web Component performance of the Calendar score, driven end to end. The
 * element renders the parts in light DOM; the expectations are computed from
 * the score and the view, never copied from the element.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  calendarBehavior,
  dateForKey,
  dayAria,
  tabbableDate,
  type CalendarConfig,
  type CalendarPart,
} from '../../../src/components/calendar/calendar.behavior';
import { calendarClasses } from '../../../src/components/calendar/calendar.classes';
import { RaftersCalendar } from '../../../src/components/calendar/calendar.element';

const base: CalendarConfig = {
  mode: 'single',
  defaultMonth: '2026-07-01',
  showOutsideDays: true,
  fixedWeeks: false,
  weekStartsOn: 0,
  today: '2026-07-15',
};

interface Scenario {
  name: string;
  attrs: string;
  config: CalendarConfig;
}

const scenarios: Scenario[] = [
  { name: 'default', attrs: '', config: base },
  { name: 'multiple', attrs: 'mode="multiple"', config: { ...base, mode: 'multiple' } },
  {
    name: 'range',
    attrs: 'mode="range" selected="2026-07-10..2026-07-14"',
    config: {
      ...base,
      mode: 'range',
      defaultSelected: { mode: 'range', from: '2026-07-10', to: '2026-07-14' },
    },
  },
  {
    name: 'bounds',
    attrs: 'from-date="2026-07-05" to-date="2026-07-25"',
    config: { ...base, fromDate: '2026-07-05', toDate: '2026-07-25' },
  },
  {
    name: 'no outside days',
    attrs: 'show-outside-days="false"',
    config: { ...base, showOutsideDays: false },
  },
  { name: 'fixed weeks', attrs: 'fixed-weeks="true"', config: { ...base, fixedWeeks: true } },
  { name: 'week starts monday', attrs: 'week-starts-on="1"', config: { ...base, weekStartsOn: 1 } },
];

async function mount(attrs = ''): Promise<RaftersCalendar> {
  document.body.innerHTML = `<form><rafters-calendar today="2026-07-15" default-month="2026-07-01" ${attrs}></rafters-calendar></form>`;
  await Promise.resolve();
  return document.querySelector('rafters-calendar') as RaftersCalendar;
}

const cell = (host: HTMLElement, iso: string): HTMLElement =>
  host.querySelector(`td[data-value="${iso}"]`) as HTMLElement;

const heading = (host: HTMLElement): string | null | undefined =>
  host.querySelector('[data-part="heading"]')?.textContent;

function expectAria(el: Element, attrs: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(attrs)) {
    expect(el.getAttribute(k)).toBe(v === undefined ? null : String(v));
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('calendar [wc]', () => {
  it('functional test from the issue', async () => {
    document.body.innerHTML =
      '<form><rafters-calendar today="2026-07-15" default-month="2026-07-01"></rafters-calendar></form>';
    await Promise.resolve();
    const host = document.querySelector('rafters-calendar') as HTMLElement;
    const config: CalendarConfig = {
      mode: 'single',
      defaultMonth: '2026-07-01',
      showOutsideDays: true,
      fixedWeeks: false,
      weekStartsOn: 0,
      today: '2026-07-15',
    };
    const state = calendarBehavior.initialState(config);
    for (const td of host.querySelectorAll<HTMLElement>('td[data-value]')) {
      expect(td.className).toBe(calendarClasses(config, state).day);
      for (const [k, v] of Object.entries(dayAria(td.dataset['value'] as string, state, config))) {
        expect(td.getAttribute(k)).toBe(v === undefined ? null : String(v));
      }
    }
    const seen: string[] = [];
    host.addEventListener('calendarselect', (e) =>
      seen.push((e as CustomEvent<{ date: string }>).detail.date),
    );
    await userEvent.click(host.querySelector('td[data-value="2026-07-10"]') as HTMLElement);
    expect(seen).toEqual(['2026-07-10']);
    expect(
      (host.querySelector('td[data-value="2026-07-10"]') as HTMLElement).getAttribute(
        'aria-selected',
      ),
    ).toBe('true');
    expect([...new FormData(document.querySelector('form') as HTMLFormElement).keys()]).toEqual([]);
  });

  it('upgrades in light DOM and renders the parts', async () => {
    const host = await mount();
    expect(host).toBeInstanceOf(RaftersCalendar);
    expect(host.shadowRoot).toBeNull();
    expect(heading(host)).toBe('July 2026');
    expect(host.querySelectorAll('th[scope="col"]')).toHaveLength(7);
  });

  for (const { name, attrs, config } of scenarios) {
    describe(name, () => {
      it('carries the view classes', async () => {
        const host = await mount(attrs);
        const state = calendarBehavior.initialState(config);
        const classes = calendarClasses(config, state);
        expect(host.querySelector('[data-part="root"]')?.className).toBe(classes.root);
        expect(host.querySelector('[data-part="header"]')?.className).toBe(classes.header);
        expect(host.querySelector('[data-part="prev"]')?.className).toBe(classes.nav);
        expect(host.querySelector('[data-part="next"]')?.className).toBe(classes.nav);
        expect(host.querySelector('[data-part="heading"]')?.className).toBe(classes.heading);
        expect(host.querySelector('[data-part="grid"]')?.className).toBe(classes.grid);
        for (const th of host.querySelectorAll('th')) expect(th.className).toBe(classes.weekday);
        const days = host.querySelectorAll('td[data-value]');
        expect(days.length).toBeGreaterThan(0);
        for (const td of days) expect(td.className).toBe(classes.day);
      });

      it('carries the aria projection and a single tabstop', async () => {
        const host = await mount(attrs);
        const state = calendarBehavior.initialState(config);
        const ids = {} as Record<CalendarPart, string>;
        for (const part of Object.keys(calendarBehavior.parts) as CalendarPart[]) {
          ids[part] = host.querySelector<HTMLElement>(`[data-part="${part}"]`)?.id ?? '';
        }
        const projection = calendarBehavior.aria(state, config, ids);
        for (const part of ['prev', 'next', 'heading', 'grid'] as const) {
          expectAria(
            host.querySelector(`[data-part="${part}"]`) as Element,
            projection[part] ?? {},
          );
        }
        for (const td of host.querySelectorAll<HTMLElement>('td[data-value]')) {
          expectAria(td, dayAria(td.dataset['value'] as string, state, config));
        }
        const tabbable = host.querySelectorAll('td[tabindex="0"]');
        expect(tabbable).toHaveLength(1);
        expect((tabbable[0] as HTMLElement).dataset['value']).toBe(tabbableDate(state, config));
      });
    });
  }

  it('click selects, fires one bubbling calendarselect, keeps focus, adds no form data', async () => {
    const host = await mount();
    const seen: string[] = [];
    document.body.addEventListener('calendarselect', (e) =>
      seen.push((e as CustomEvent<{ date: string }>).detail.date),
    );
    await userEvent.click(cell(host, '2026-07-10'));
    expect(seen).toEqual(['2026-07-10']);
    expect(cell(host, '2026-07-10').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(cell(host, '2026-07-10'));
    expect([...new FormData(document.querySelector('form') as HTMLFormElement).keys()]).toEqual([]);
  });

  it('Enter and Space select the focused day', async () => {
    const host = await mount();
    const user = userEvent.setup();
    cell(host, '2026-07-10').focus();
    await user.keyboard('{Enter}');
    expect(cell(host, '2026-07-10').getAttribute('aria-selected')).toBe('true');
    cell(host, '2026-07-12').focus();
    await user.keyboard(' ');
    expect(cell(host, '2026-07-12').getAttribute('aria-selected')).toBe('true');
  });

  it('range orders endpoints; multiple toggles', async () => {
    const range = await mount('mode="range"');
    await userEvent.click(cell(range, '2026-07-14'));
    await userEvent.click(cell(range, '2026-07-10'));
    expect(cell(range, '2026-07-10').getAttribute('aria-selected')).toBe('true');
    expect(cell(range, '2026-07-14').getAttribute('aria-selected')).toBe('true');
    for (const d of ['11', '12', '13']) {
      expect(cell(range, `2026-07-${d}`).getAttribute('data-in-range')).toBe('true');
    }
    const multi = await mount('mode="multiple"');
    await userEvent.click(cell(multi, '2026-07-10'));
    await userEvent.click(cell(multi, '2026-07-10'));
    expect(cell(multi, '2026-07-10').getAttribute('aria-selected')).toBe('false');
  });

  it('selected seeds the selection and a click moves it', async () => {
    const host = await mount('selected="2026-07-10"');
    expect(cell(host, '2026-07-10').getAttribute('aria-selected')).toBe('true');
    await userEvent.click(cell(host, '2026-07-12'));
    expect(cell(host, '2026-07-12').getAttribute('aria-selected')).toBe('true');
    expect(cell(host, '2026-07-10').getAttribute('aria-selected')).toBe('false');
  });

  it('refuses days outside the bounds and outside the month', async () => {
    const host = await mount('from-date="2026-07-05"');
    const seen: string[] = [];
    host.addEventListener('calendarselect', (e) =>
      seen.push((e as CustomEvent<{ date: string }>).detail.date),
    );
    await userEvent.click(cell(host, '2026-07-03'));
    cell(host, '2026-07-03').focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(host.querySelector('td[data-outside="true"]') as HTMLElement);
    expect(seen).toEqual([]);
    expect(cell(host, '2026-07-03').getAttribute('aria-selected')).toBe('false');
    expect(cell(host, '2026-07-03').getAttribute('aria-disabled')).toBe('true');
  });

  it('keys move focus and cross the month boundary', async () => {
    const host = await mount();
    const user = userEvent.setup();
    cell(host, '2026-07-31').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cell(host, '2026-08-01'));
    expect(heading(host)).toBe('August 2026');
    const steps: ReadonlyArray<readonly [string, boolean, string]> = [
      ['Home', false, '{Home}'],
      ['End', false, '{End}'],
      ['ArrowDown', false, '{ArrowDown}'],
      ['ArrowUp', false, '{ArrowUp}'],
      ['PageDown', false, '{PageDown}'],
      ['PageDown', true, '{Shift>}{PageDown}{/Shift}'],
    ];
    for (const [key, shift, code] of steps) {
      const from = (document.activeElement as HTMLElement).dataset['value'] as string;
      await user.keyboard(code);
      expect((document.activeElement as HTMLElement).dataset['value']).toBe(
        dateForKey(key, from, shift),
      );
    }
  });

  it('prev and next page the month and fire no calendarselect; Enter on prev pages', async () => {
    const host = await mount();
    const seen: string[] = [];
    host.addEventListener('calendarselect', () => seen.push('x'));
    const user = userEvent.setup();
    await user.click(host.querySelector('[data-part="next"]') as HTMLElement);
    expect(heading(host)).toBe('August 2026');
    await user.click(host.querySelector('[data-part="prev"]') as HTMLElement);
    expect(heading(host)).toBe('July 2026');
    (host.querySelector('[data-part="prev"]') as HTMLElement).focus();
    await user.keyboard('{Enter}');
    expect(heading(host)).toBe('June 2026');
    expect(seen).toEqual([]);
  });

  it('re-adding the element leaves one set of parts and one event per click', async () => {
    const host = await mount();
    const form = host.parentElement as HTMLElement;
    host.remove();
    form.append(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="root"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="grid"]')).toHaveLength(1);
    const seen: string[] = [];
    host.addEventListener('calendarselect', () => seen.push('x'));
    await userEvent.click(cell(host, '2026-07-10'));
    expect(seen).toHaveLength(1);
  });

  it('falls back to defaults for out-of-enum attributes', async () => {
    const host = await mount('mode="bogus" week-starts-on="9"');
    const root = host.querySelector('[data-part="root"]');
    expect(root?.getAttribute('data-mode')).toBe('single');
    expect(root?.getAttribute('data-week-starts-on')).toBe('0');
  });
});
