/**
 * Astro performance of the calendar score. AstroContainer renders the SSR markup
 * with the initial month already projected, but does NOT run the <script>, so
 * the test calls bindCalendar directly -- that IS the script's job -- then drives
 * the same score the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Calendar from '../../../src/components/calendar/calendar.astro';
import {
  bindCalendar,
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Calendar, {
    props: { id: 'cal', today: '2026-07-20', defaultMonth: '2026-07-01', ...props },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-part="root"][data-mode]') as HTMLElement;
  bindCalendar(root); // the <script> does this per instance on the real page
  return root;
}

function baseConfig(overrides: Partial<CalendarConfig> = {}): CalendarConfig {
  return {
    mode: 'single',
    showOutsideDays: true,
    fixedWeeks: false,
    weekStartsOn: 0,
    today: '2026-07-20',
    defaultMonth: '2026-07-01',
    ...overrides,
  };
}

const dayCell = (iso: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`)!;

/** Every declared part present, and its rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(
  root: HTMLElement,
  state: ReturnType<typeof calendarBehavior.initialState>,
  config: CalendarConfig,
  expectedParts: ReadonlyArray<'grid' | 'heading' | 'prev' | 'next'>,
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const declaredRole = calendarBehavior.parts[part].role;
    if (declaredRole) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(declaredRole);
    }
  }
  const ids = {
    root: root.id,
    prev: partElement(root, 'prev')?.id ?? '',
    next: partElement(root, 'next')?.id ?? '',
    heading: partElement(root, 'heading')?.id ?? '',
    grid: partElement(root, 'grid')?.id ?? '',
    day: '',
  };
  const projection = calendarBehavior.aria(state, config, ids);
  for (const part of expectedParts) {
    const attrs = projection[part];
    if (!attrs) continue;
    const element = partElement(root, part);
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/** Every rendered `day` instance's ARIA equal to the score's per-instance
 *  projection, keyed by the DOM's own `data-value`. */
function assertDayInstances(
  root: HTMLElement,
  state: ReturnType<typeof calendarBehavior.initialState>,
  config: CalendarConfig,
): void {
  const project = calendarBehavior.instanceAria;
  if (!project) return;
  for (const cell of Array.from(root.querySelectorAll<HTMLElement>('[data-part="day"]'))) {
    const value = cell.dataset['value'];
    if (value === undefined) continue;
    const projected = project('day', value, state, config, {
      root: root.id,
      prev: '',
      next: '',
      heading: '',
      grid: '',
      day: '',
    });
    for (const [attr, expected] of Object.entries(projected)) {
      if (expected === undefined) {
        expect(cell.hasAttribute(attr), `day "${value}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(cell.getAttribute(attr), `day "${value}" ${attr}`).toBe(String(expected));
      }
    }
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('calendar [astro]', () => {
  it('SSR: a labelled grid with the seeded month and today marked', async () => {
    await mount();
    expect(partElement(document.body, 'grid')?.getAttribute('role')).toBe('grid');
    expect(partElement(document.body, 'heading')?.textContent).toBe('July 2026');
    expect(dayCell('2026-07-20').getAttribute('data-today')).toBe('true');
  });

  it('contract: grid/heading/nav projections and per-day ARIA equal the DOM', async () => {
    const root = await mount();
    const config = baseConfig();
    const state = calendarBehavior.initialState(config);
    assertContract(root, state, config, ['grid', 'heading', 'prev', 'next']);
    assertDayInstances(root, state, config);
  });

  it('click selects a day and reflects the projection', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(dayCell('2026-07-09'));
    expect(dayCell('2026-07-09').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-09').getAttribute('data-selected')).toBe('true');
  });

  it('arrow keys move focus and cross the month boundary', async () => {
    const user = userEvent.setup();
    await mount();
    dayCell('2026-07-31').focus();
    await user.keyboard('{ArrowRight}');
    expect(partElement(document.body, 'heading')?.textContent).toBe('August 2026');
    expect(document.activeElement).toBe(dayCell('2026-08-01'));
  });

  it('the header controls page the visible month', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(partElement(document.body, 'next')!);
    expect(partElement(document.body, 'heading')?.textContent).toBe('August 2026');
  });

  it('Enter activates a focused header control (native button, not suppressed)', async () => {
    const user = userEvent.setup();
    await mount();
    partElement(document.body, 'next')!.focus();
    await user.keyboard('{Enter}');
    expect(partElement(document.body, 'heading')?.textContent).toBe('August 2026');
  });
});
