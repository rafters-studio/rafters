/**
 * Astro performance of the date-picker score, driven end to end. AstroContainer
 * renders the SSR markup (with calendar's Astro performance nested in the
 * popup) but does NOT run the <script>s, so the test calls bindDatePicker
 * directly -- that IS the script's job -- and the picker binds the nested
 * calendar because no calendar script marked it bound.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from '../../../src/components/date-picker/date-picker.astro';
import {
  bindDatePicker,
  datePicker,
} from '../../../src/components/date-picker/date-picker.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}, wrap = 'main'): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(DatePicker, {
    props: { id: 'dp', today: '2026-07-20', defaultMonth: '2026-07-01', ...props },
  });
  document.body.innerHTML = `<${wrap}>${html}</${wrap}>`;
  return document.body.querySelector('[data-part="root"][data-date-picker]') as HTMLElement;
}

async function mount(props: Record<string, unknown> = {}, wrap = 'main'): Promise<HTMLElement> {
  const root = await render(props, wrap);
  bindDatePicker(root); // the <script> does this per instance on the real page
  return root;
}

const part = (name: string): HTMLElement =>
  document.body.querySelector<HTMLElement>(`[data-part="${name}"]`) as HTMLElement;
const dayCell = (iso: string): HTMLElement =>
  document.body.querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`) as HTMLElement;

describe('date-picker [astro]', () => {
  it('SSR: closed projection, placeholder label, popup hidden, dialog named by the trigger', async () => {
    await render();
    const config = { mode: 'single' } as const;
    const aria = datePicker.aria(datePicker.initialState(config), config, {
      trigger: 'dp-trigger',
      content: 'dp-content',
      value: 'dp-value',
      anchor: '',
      close: '',
    });
    expect(part('value').textContent).toBe('Pick a date');
    expect(part('value').hasAttribute('data-empty')).toBe(true);
    expect(part('content').hidden).toBe(true);
    expect(part('trigger').getAttribute('aria-expanded')).toBe(aria.trigger?.['aria-expanded']);
    expect(part('trigger').getAttribute('aria-haspopup')).toBe('dialog');
    expect(part('trigger').hasAttribute('aria-controls')).toBe(false);
    expect(part('content').getAttribute('role')).toBe('dialog');
    expect(part('content').getAttribute('aria-labelledby')).toBe('dp-trigger');
  });

  it('SSR with a value: the label and the nested calendar agree', async () => {
    await render({ value: '2026-07-08' });
    expect(part('value').textContent).toBe('Jul 8, 2026');
    expect(dayCell('2026-07-08').getAttribute('aria-selected')).toBe('true');
  });

  it('the root carries neither calendar nor popover script markers', async () => {
    const root = await render({ mode: 'range' });
    expect(root.hasAttribute('data-mode')).toBe(false);
    expect(root.hasAttribute('data-popover')).toBe(false);
    expect(root.hasAttribute('class')).toBe(false);
    expect(root.dataset['pickerMode']).toBe('range');
  });

  it('bind: open, select, close; the nested calendar is bound by the picker', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(part('trigger'));
    expect(part('content').hidden).toBe(false);
    expect(part('trigger').getAttribute('aria-controls')).toBe('dp-content');
    await user.click(dayCell('2026-07-08'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
    expect(part('value').hasAttribute('data-empty')).toBe(false);
    expect(part('content').hidden).toBe(true);
  });

  it('Escape inside the popup closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(part('trigger'));
    dayCell('2026-07-20').focus();
    await user.keyboard('{Escape}');
    expect(part('content').hidden).toBe(true);
  });

  it('range: open until the end is picked; the form value is from..to', async () => {
    const user = userEvent.setup();
    await mount({ mode: 'range', name: 'stay' }, 'form');
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-10'));
    expect(part('content').hidden).toBe(false);
    await user.click(dayCell('2026-07-14'));
    expect(part('content').hidden).toBe(true);
    const input = document.body.querySelector<HTMLInputElement>('input[data-part="hidden-input"]');
    expect(input?.name).toBe('stay');
    expect(input?.value).toBe('2026-07-10..2026-07-14');
  });

  it('a calendar already bound by its own script is left alone', async () => {
    const root = await render();
    const calendarRoot = root.querySelector<HTMLElement>('[data-part="root"][data-mode]');
    calendarRoot?.setAttribute('data-bound', 'true');
    const teardown = bindDatePicker(root);
    teardown();
    expect(calendarRoot?.dataset['bound']).toBe('true');
  });

  it('disabled: the trigger renders disabled and the bind refuses to open', async () => {
    const root = await mount({ disabled: true });
    expect((part('trigger') as HTMLButtonElement).disabled).toBe(true);
    expect(root.dataset['disabled']).toBe('true');
    part('trigger').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(part('content').hidden).toBe(true);
  });
});
