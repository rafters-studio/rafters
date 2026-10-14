/**
 * WC performance of the date-picker score, driven end to end. The element
 * scaffolds the trigger, the popup and the hidden input, nests
 * <rafters-calendar> (which scaffolds and binds the grid itself), and hands the
 * root to bindDatePicker -- the same score and client the Astro performance
 * drives. today/default-month are pinned so the projection is deterministic.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../../src/components/date-picker/date-picker.element';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
import {
  datePicker,
  type DatePickerConfig,
  type DatePickerPart,
} from '../../../src/components/date-picker/date-picker.behavior';

const body = () => document.body;
const part = (name: string): HTMLElement => {
  const el = body().querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!el) throw new Error(`no part ${name}`);
  return el;
};
const dayCell = (iso: string): HTMLElement => {
  const el = body().querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`);
  if (!el) throw new Error(`no day cell for ${iso}`);
  return el;
};

async function mount(attrs: Record<string, string> = {}, wrap = 'main'): Promise<HTMLElement> {
  const merged: Record<string, string> = {
    today: '2026-07-20',
    'default-month': '2026-07-01',
    ...attrs,
  };
  const attrString = Object.entries(merged)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  body().innerHTML = `<${wrap}><rafters-date-picker ${attrString}></rafters-date-picker></${wrap}>`;
  // The picker scaffolds + binds one microtask after connecting; the nested
  // calendar it creates does the same one microtask later.
  await Promise.resolve();
  await Promise.resolve();
  return part('root');
}

function assertContract(open: boolean, config: DatePickerConfig): void {
  const rendered: DatePickerPart[] = ['trigger', 'content', 'value'];
  const ids = {
    trigger: '',
    content: '',
    value: '',
    anchor: '',
    close: '',
    startIcon: '',
    endIcon: '',
  };
  for (const name of rendered) ids[name] = part(name).id;
  const state = { ...datePicker.initialState(config), open };
  const projection = datePicker.aria(state, config, ids);
  for (const name of rendered) {
    for (const [attr, value] of Object.entries(projection[name] ?? {})) {
      if (value === undefined) {
        expect(part(name).hasAttribute(attr), `${name} must NOT render ${attr}`).toBe(false);
      } else {
        expect(part(name).getAttribute(attr), `${name} ${attr}`).toBe(String(value));
      }
    }
  }
}

afterEach(() => {
  body().replaceChildren();
});

describe('rafters-date-picker [wc]', () => {
  it('scaffolds the parts with the closed projection and the nested grid', async () => {
    await mount();
    expect(part('value').textContent).toBe('Pick a date');
    expect(part('content').inert).toBe(true);
    // Present while closed (inert, never hidden) so the exit transition can play.
    expect(part('content').hidden).toBe(false);
    expect(part('content').getAttribute('data-state')).toBe('closed');
    expect(body().querySelector('[data-part="grid"]')).not.toBeNull();
    assertContract(false, { mode: 'single' });
  });

  it('opens, selects, closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(part('trigger'));
    expect(part('content').inert).toBe(false);
    assertContract(true, { mode: 'single' });
    expect(document.activeElement).toBe(dayCell('2026-07-20'));
    await user.click(dayCell('2026-07-08'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
    expect(part('content').inert).toBe(true);
    expect(document.activeElement).toBe(part('trigger'));
  });

  it('Escape from a focused day cell closes', async () => {
    const user = userEvent.setup();
    await mount({ value: '2026-07-08' });
    expect(part('value').textContent).toBe('Jul 8, 2026');
    await user.click(part('trigger'));
    expect(document.activeElement).toBe(dayCell('2026-07-08'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(dayCell('2026-07-15'));
    await user.keyboard('{Escape}');
    expect(part('content').inert).toBe(true);
    expect(document.activeElement).toBe(part('trigger'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
  });

  it('an outside pointerdown dismisses without changing the value', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(part('trigger'));
    expect(part('content').inert).toBe(false);
    await user.click(body().querySelector('main') as HTMLElement);
    expect(part('content').inert).toBe(true);
    expect(part('value').textContent).toBe('Pick a date');
  });

  it('disconnecting tears the bind down: the trigger no longer opens', async () => {
    const user = userEvent.setup();
    await mount();
    const host = body().querySelector('rafters-date-picker') as HTMLElement;
    const trigger = part('trigger');
    const content = part('content');
    host.remove();
    body().appendChild(trigger);
    await user.click(trigger);
    expect(content.inert).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('range mode stays open for the end, then closes with both dates', async () => {
    const user = userEvent.setup();
    await mount({ mode: 'range' });
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-10'));
    expect(part('content').inert).toBe(false);
    await user.click(dayCell('2026-07-14'));
    expect(part('content').inert).toBe(true);
    expect(part('value').textContent).toBe('Jul 10, 2026 - Jul 14, 2026');
  });

  it('range by keyboard: focus stays in the grid after the start, Escape still closes', async () => {
    const user = userEvent.setup();
    await mount({ mode: 'range' });
    await user.click(part('trigger'));
    await user.keyboard('{Enter}');
    expect(part('content').inert).toBe(false);
    expect(document.activeElement).toBe(dayCell('2026-07-20'));
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    expect(part('content').inert).toBe(true);
    expect(part('value').textContent).toBe('Jul 20, 2026 - Jul 22, 2026');
    await user.click(part('trigger'));
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    expect(part('content').inert).toBe(true);
  });

  it('submits with its form through the hidden input', async () => {
    const user = userEvent.setup();
    await mount({ name: 'due', mode: 'range' }, 'form');
    const form = body().querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('due')).toBe('');
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-10'));
    await user.click(dayCell('2026-07-14'));
    expect(new FormData(form).get('due')).toBe('2026-07-10..2026-07-14');
  });

  it('disabled: the trigger is inert and the popup never opens', async () => {
    const user = userEvent.setup();
    await mount({ disabled: '' });
    expect((part('trigger') as HTMLButtonElement).disabled).toBe(true);
    await user.click(part('trigger'));
    expect(part('content').inert).toBe(true);
  });
});

describe('date-picker icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => {
    body().innerHTML = '';
    uninstall();
  });

  async function mountIcons(children: string): Promise<HTMLElement> {
    body().innerHTML = `<main><rafters-date-picker today="2026-07-20" default-month="2026-07-01">${children}</rafters-date-picker></main>`;
    await Promise.resolve();
    await Promise.resolve();
    return part('trigger');
  }

  it('slot="start-icon" and slot="end-icon" children become hidden wrappers beside the label', async () => {
    const trigger = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span><span slot="end-icon">${ICON_SVG_20}</span>`,
    );
    const start = trigger.querySelector('[data-part="startIcon"]');
    const end = trigger.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const r = rectsOf(trigger);
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.value.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.value.right - 0.5);
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', async () => {
    document.documentElement.dir = 'rtl';
    const trigger = await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>`);
    const r = rectsOf(trigger);
    expect((r.start as DOMRect).left).toBeGreaterThan(r.value.left);
  });

  it('no wrapper without an icon child', async () => {
    const trigger = await mountIcons('');
    expect(trigger.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(trigger.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
