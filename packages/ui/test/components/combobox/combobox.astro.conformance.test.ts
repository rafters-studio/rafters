/**
 * Astro performance of the combobox score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindCombobox directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Combobox from '../../../src/components/combobox/combobox.astro';
import { bindCombobox } from '../../../src/components/combobox/combobox.behavior';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Combobox, {
    props: { id: 'cb', options, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-combobox') as HTMLElement;
  bindCombobox(root); // the <script> does this per instance on the real page
  return root;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;
const toggle = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const empty = () => document.body.querySelector<HTMLElement>('[data-part="empty"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

describe('combobox conformance [astro]', () => {
  it('SSR closed: listbox hidden and crawlable, input a collapsed combobox', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    // Options are present in the DOM even while closed -- SSR-stable.
    expect(option('react')).not.toBeNull();
    expect(content().getAttribute('aria-labelledby')).toBe('cb-input');
    // Each option carries the fixed activedescendant id contract.
    expect(option('vue').id).toBe('cb-content-option-vue');
  });

  it('bind: typing filters the options and reveals the empty state', async () => {
    const user = userEvent.setup();
    await mount();
    input().focus();
    await user.keyboard('ang');
    expect(content().hidden).toBe(false);
    expect(option('angular').hidden).toBe(false);
    expect(option('react').hidden).toBe(true);

    await user.keyboard('zzz');
    expect(empty().hidden).toBe(false);
  });

  it('bind: ArrowDown opens and activedescendant tracks the highlight', async () => {
    const user = userEvent.setup();
    await mount();
    input().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(input().getAttribute('aria-activedescendant')).toBe('cb-content-option-react');
  });

  it('bind: clicking an option commits, closes, and fills the input', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(option('vue'));
    expect(content().hidden).toBe(true);
    expect(input().value).toBe('Vue');
    expect(option('vue').getAttribute('aria-selected')).toBe('true');
  });

  it('bind: Escape closes the list', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(toggle());
    input().focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });
});
