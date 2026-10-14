/**
 * Astro performance of the dropdown-menu score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindDropdownMenu directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_SVG_16 } from './icon-layout';
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

describe('dropdown-menu [astro]', () => {
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

describe('dropdown-menu icons [astro]', () => {
  const withIcon = async (): Promise<string> => {
    const container = await AstroContainer.create();
    return container.renderToString(DropdownMenu, {
      props: { id: 'dm', label: 'Options', items },
      slots: { 'start-icon-0': ICON_SVG_16 },
    });
  };

  it('SSR, no script run: the icon wrapper already has aria-hidden="true"', async () => {
    const doc = new DOMParser().parseFromString(await withIcon(), 'text/html');
    const wrappers = doc.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(wrappers[0]!.getAttribute('data-icon')).toBe('inline-start');
    expect(
      doc.querySelectorAll('[data-part="item"]')[1]!.querySelector('[data-part="startIcon"]'),
    ).toBeNull();
  });

  it('renders no wrapper when no icon slot is given', async () => {
    await mount();
    expect(document.body.querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('the icon precedes the label in reading order', async () => {
    document.body.innerHTML = await withIcon();
    const root = document.body.querySelector('rafters-dropdown-menu') as HTMLElement;
    bindDropdownMenu(root);
    trigger().click();
    const edit = item('Edit');
    expect([...edit.children].map((el) => el.getAttribute('data-part'))).toEqual([
      'startIcon',
      null,
    ]);
    expect(edit.lastElementChild?.textContent).toBe('Edit');
  });
});
