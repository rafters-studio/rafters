/**
 * Astro performance of the select score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindSelect directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Select from '../../../src/components/select/select.astro';
import { bindSelect } from '../../../src/components/select/select.behavior';

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Select, {
    props: { id: 's', options, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-select') as HTMLElement;
  bindSelect(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const valueEl = () => document.body.querySelector<HTMLElement>('[data-part="value"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

describe('select conformance [astro]', () => {
  it('SSR closed: listbox hidden and crawlable, trigger a collapsed combobox', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    // Options are present in the DOM even while closed -- SSR-stable.
    expect(option('apple')).not.toBeNull();
    expect(content().getAttribute('aria-labelledby')).toBe('s-trigger');
  });

  it('SSR renders the selected label; empty renders the placeholder', async () => {
    await mount({ value: 'banana' });
    expect(valueEl().textContent?.trim()).toBe('Banana');
    expect(option('banana').getAttribute('aria-selected')).toBe('true');

    document.body.innerHTML = '';
    await mount({ placeholder: 'Choose one' });
    expect(valueEl().textContent?.trim()).toBe('Choose one');
    expect(valueEl().hasAttribute('data-empty')).toBe(true);
  });

  it('bind: click opens; selecting an option commits, closes, updates the value', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(option('apple'));

    await user.click(option('cherry'));
    expect(content().hidden).toBe(true);
    expect(option('cherry').getAttribute('aria-selected')).toBe('true');
    expect(valueEl().textContent?.trim()).toBe('Cherry');
    expect(document.activeElement).toBe(trigger());
  });

  it('bind: Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });
});
