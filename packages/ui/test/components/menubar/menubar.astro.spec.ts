/**
 * Astro performance of the menubar score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindMenubar directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Menubar from '../../../src/components/menubar/menubar.astro';
import {
  bindMenubar,
  menubar,
  menubarInstanceAria,
  type MenubarState,
} from '../../../src/components/menubar/menubar.behavior';

const menus = [
  {
    value: 'file',
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Cmd+N' },
      { label: 'Open' },
      { label: 'Share', disabled: true },
      { label: 'Print' },
    ],
  },
  { value: 'edit', label: 'Edit', items: [{ label: 'Undo' }, { label: 'Redo' }] },
  { value: 'view', label: 'View', items: [{ label: 'Zoom' }] },
];

let teardown: (() => void) | null = null;

afterEach(() => {
  teardown?.();
  teardown = null;
  document.body.innerHTML = '';
});

async function render(): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Menubar, { props: { id: 'mb', menus } });
  document.body.innerHTML = html;
  return document.body.querySelector('rafters-menubar') as HTMLElement;
}

async function mount(): Promise<HTMLElement> {
  const root = await render();
  teardown = bindMenubar(root); // the <script> does this per instance on the real page
  return root;
}

const root = () => document.body.querySelector<HTMLElement>('rafters-menubar')!;
const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;
const item = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]')).find((el) =>
    el.textContent?.trim().startsWith(label),
  )!;

function assertAriaContract(state: MenubarState): void {
  const expectAttrs = (el: HTMLElement, attrs: Record<string, unknown>, label: string) => {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) expect(el.hasAttribute(attr), `${label} ${attr}`).toBe(false);
      else expect(el.getAttribute(attr), `${label} ${attr}`).toBe(String(value));
    }
  };
  const ids = { root: 'mb-root', trigger: '', content: '', item: '' };
  expectAttrs(root(), menubar.aria(state, {}, ids).root ?? {}, 'root');
  for (const { value } of menus) {
    const instance = { trigger: `mb-trigger-${value}`, content: `mb-content-${value}` };
    expectAttrs(trigger(value), menubarInstanceAria('trigger', value, state, {}, instance), value);
    expectAttrs(content(value), menubarInstanceAria('content', value, state, {}, instance), value);
  }
}

describe('menubar [astro]', () => {
  it('SSR: the closed projection is in the markup before any script runs', async () => {
    await render();
    assertAriaContract(menubar.initialState({}));
    expect(root().getAttribute('role')).toBe('menubar');
    expect(trigger('file').getAttribute('role')).toBe('menuitem');
    expect(content('file').inert).toBe(true);
    // Items and shortcuts are present in the DOM even while closed.
    expect(item('New').textContent).toContain('Cmd+N');
  });

  it('bind: the menus leave the bar, which then holds only its triggers', async () => {
    await mount();
    expect(root().contains(content('file'))).toBe(false);
    expect(root().querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it('bind: click opens a menu and lands focus on its first item', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    expect(content('file').inert).toBe(false);
    assertAriaContract({ active: 'file', pointerOpened: false });
    expect(document.activeElement).toBe(item('New'));
  });

  it('bind: ArrowRight inside a menu moves to the next menu', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{ArrowRight}');
    expect(content('file').inert).toBe(true);
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it('bind: activating an item closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('edit'));
    await user.click(item('Redo'));
    expect(content('edit').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('edit'));
  });

  it('bind: Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{Escape}');
    expect(content('file').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('teardown restores each menu to its authored place in the bar', async () => {
    await mount();
    teardown?.();
    teardown = null;
    expect(root().contains(content('file'))).toBe(true);
  });
});
