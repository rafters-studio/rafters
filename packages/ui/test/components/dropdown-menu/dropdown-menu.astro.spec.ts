/**
 * Astro performance of the dropdown-menu score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindDropdownMenu directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import DropdownMenu from '../../../src/components/dropdown-menu/dropdown-menu.astro';
import { bindDropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';

const items = [
  { label: 'Edit' },
  { label: 'Duplicate' },
  { label: 'Archive', disabled: true },
  { label: 'Delete' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(DropdownMenu, {
    props: { id: 'dm', label: 'Options', items, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-dropdown-menu') as HTMLElement;
  bindDropdownMenu(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const item = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent?.trim() === label,
  )!;

describe('dropdown-menu conformance [astro]', () => {
  it('SSR closed: menu hidden and crawlable, trigger a collapsed menu button', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    // Items are present in the DOM even while closed -- SSR-stable.
    expect(item('Edit')).not.toBeUndefined();
    expect(content().getAttribute('role')).toBe('menu');
    expect(content().getAttribute('aria-labelledby')).toBe('dm-trigger');
  });

  it('bind: click opens and lands focus on the first item', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-controls')).toBe('dm-content');
    expect(document.activeElement).toBe(item('Edit'));
  });

  it('bind: activating an item closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.click(item('Duplicate'));
    expect(content().hidden).toBe(true);
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
