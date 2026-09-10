/**
 * Astro performance of the command score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindCommand directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Command from '../../../src/components/command/command.astro';
import {
  bindCommand,
  COMMAND_SELECT_EVENT,
} from '../../../src/components/command/command.behavior';

const items = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'search', label: 'Search' },
  { value: 'settings', label: 'Settings', shortcut: 'Cmd+S' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Command, {
    props: { id: 'c', items, label: 'Actions', ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-command') as HTMLElement;
  bindCommand(root); // the <script> does this per instance on the real page
  return root;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;
const list = () => document.body.querySelector<HTMLElement>('[data-part="list"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;
const emptyEl = () => document.body.querySelector<HTMLElement>('[data-part="empty"]')!;

describe('command conformance [astro]', () => {
  it('SSR renders a combobox and a crawlable listbox of options', async () => {
    await mount();
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-controls')).toBe('c-list');
    expect(list().getAttribute('role')).toBe('listbox');
    expect(list().getAttribute('aria-label')).toBe('Actions');
    // Options are present in the DOM and all visible before any query.
    expect(option('calendar')).not.toBeNull();
    expect(option('settings').hidden).toBe(false);
  });

  it('bind: typing fuzzy-filters the options', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(input());
    await user.keyboard('set');
    expect(option('settings').hidden).toBe(false);
    expect(option('calendar').hidden).toBe(true);
  });

  it('bind: arrows highlight and Enter commits via the command-select event', async () => {
    const user = userEvent.setup();
    const root = await mount();
    const seen: string[] = [];
    root.addEventListener(COMMAND_SELECT_EVENT, (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe('c-item-calendar');
    await user.keyboard('{Enter}');
    expect(seen).toEqual(['calendar']);
  });

  it('bind: the empty state appears only when the query matches nothing', async () => {
    const user = userEvent.setup();
    await mount();
    expect(emptyEl().hidden).toBe(true);
    await user.click(input());
    await user.keyboard('zzz');
    expect(emptyEl().hidden).toBe(false);
  });
});
