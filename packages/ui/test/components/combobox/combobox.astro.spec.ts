/**
 * Astro performance of the combobox score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindCombobox directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_SVG_16 } from './icon-layout';
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

describe('combobox icons [astro]', () => {
  const withIcons = async (): Promise<string> => {
    const container = await AstroContainer.create();
    return container.renderToString(Combobox, {
      props: { id: 'cb', options },
      slots: { 'start-icon': ICON_SVG_16, 'start-icon-react': ICON_SVG_16 },
    });
  };

  it('SSR, no script run: each icon wrapper already has aria-hidden="true"', async () => {
    const html = await withIcons();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const wrappers = doc.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(2);
    for (const wrapper of wrappers) {
      expect(wrapper.getAttribute('aria-hidden')).toBe('true');
      expect(wrapper.getAttribute('data-icon')).toBe('inline-start');
    }
    expect(doc.querySelector('[data-value="vue"] [data-part="startIcon"]')).toBeNull();
  });

  it('renders no wrapper when no icon slot is given', async () => {
    await mount();
    expect(document.body.querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('the icons sit in reading order: before the toggle, and before the option label', async () => {
    document.body.innerHTML = await withIcons();
    const field = document.body.querySelector('[data-part="field"]') as HTMLElement;
    expect([...field.children].map((el) => el.getAttribute('data-part'))).toEqual([
      'input',
      'startIcon',
      'trigger',
    ]);
    const parts = [...option('react').children].map((el) => el.getAttribute('data-part'));
    expect(parts).toEqual([null, 'startIcon', null]);
    expect(option('react').lastElementChild?.textContent).toBe('React');
  });
});

describe('combobox [astro]', () => {
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

  it('SSR renders the toggle label and the bind flips it with the open state', async () => {
    const user = userEvent.setup();
    await mount();
    // SSR closed-state projection names the toggle "Open" before hydration.
    expect(toggle().getAttribute('aria-label')).toBe('Open');
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    expect(toggle().getAttribute('aria-label')).toBe('Close');
    await user.click(toggle());
    expect(content().hidden).toBe(true);
    expect(toggle().getAttribute('aria-label')).toBe('Open');
  });
});
