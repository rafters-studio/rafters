/**
 * Astro performance of the context-menu score, driven end to end. AstroContainer
 * renders the SSR markup with the initial (closed) projection already applied,
 * but does NOT run the <script>, so the test calls bindContextMenu directly --
 * that IS the script's job -- then drives the same score the React and WC
 * performances drive. The SSR markup is wrapped in a <main> landmark so axe's
 * best-practice region rule holds for the menu.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ContextMenu from '../../../src/components/context-menu/context-menu.astro';
import {
  bindContextMenu,
  contextMenu,
} from '../../../src/components/context-menu/context-menu.behavior';
import { assertAxeClean, assertContractFulfillment } from '../../harness/conformance';

const items = [
  { label: 'Cut' },
  { label: 'Copy' },
  { type: 'separator' as const },
  { label: 'Paste', disabled: true },
  { label: 'Delete', shortcut: 'Del' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ContextMenu, {
    props: { id: 'cm', triggerLabel: 'Right-click here', items },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-context-menu-root]') as HTMLElement;
  bindContextMenu(root); // the <script> does this per instance on the real page
  return root;
}

const itemsWithSub = [
  { label: 'Cut' },
  {
    type: 'sub' as const,
    label: 'More',
    subItems: [
      { label: 'Deep' },
      { type: 'sub' as const, label: 'Even more', subItems: [{ label: 'Grandchild' }] },
    ],
  },
];

async function mountWithSub(): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ContextMenu, {
    props: { id: 'cm', triggerLabel: 'Right-click here', items: itemsWithSub },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-context-menu-root]') as HTMLElement;
  bindContextMenu(root);
  return root;
}

const subTrigger = () =>
  document.body.querySelector<HTMLElement>('[data-part="sub-trigger"]') as HTMLElement;
const subContent = () =>
  document.body.querySelector<HTMLElement>('[data-part="sub-content"]') as HTMLElement;
const subTriggerByText = (text: string): HTMLElement => {
  const match = Array.from(
    document.body.querySelectorAll<HTMLElement>('[data-part="sub-trigger"]'),
  ).find((element) => element.textContent?.trim().startsWith(text));
  if (!match) throw new Error(`no sub-trigger ${text}`);
  return match;
};
const grandchildContent = () =>
  document.body.querySelector<HTMLElement>(
    '[data-part="sub-content"][aria-label="Even more"]',
  ) as HTMLElement;

const trigger = () =>
  document.body.querySelector<HTMLElement>('[data-part="trigger"]') as HTMLElement;
const content = () =>
  document.body.querySelector<HTMLElement>('[data-part="content"]') as HTMLElement;
const itemByText = (text: string): HTMLElement => {
  const match = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (element) => element.textContent?.trim().startsWith(text),
  );
  if (!match) throw new Error(`no item ${text}`);
  return match;
};

describe('context-menu conformance [astro]', () => {
  it('SSR closed: content present-but-hidden, items in the DOM, axe-clean', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(content().getAttribute('data-state')).toBe('closed');
    expect(content().querySelectorAll('[role="menuitem"]').length).toBe(4);
    await assertAxeClean(document.body);
  });

  it('per-part ARIA equals the score projection, closed (SSR) and open', async () => {
    await mount();
    assertContractFulfillment(
      contextMenu,
      document.body,
      { open: false, x: 0, y: 0 },
      { loop: true, avoidCollisions: true },
      ['trigger', 'content'],
    );
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    assertContractFulfillment(
      contextMenu,
      document.body,
      { open: true, x: 12, y: 22 },
      { loop: true, avoidCollisions: true },
      ['trigger', 'content'],
    );
  });

  it('right-click opens at the pointer point and focuses the first item', async () => {
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    expect(content().hidden).toBe(false);
    expect(content().style.left).toBe('12px');
    expect(content().style.top).toBe('22px');
    expect(document.activeElement).toBe(itemByText('Cut'));
    await assertAxeClean(document.body);
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    expect(content().hidden).toBe(false);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('selecting an item closes the menu', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    await user.click(itemByText('Copy'));
    expect(content().hidden).toBe(true);
  });

  it('a SSR submenu opens on ArrowRight and closes on ArrowLeft', async () => {
    const user = userEvent.setup();
    await mountWithSub();
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    expect(subContent().hidden).toBe(true);
    subTrigger().focus();
    await user.keyboard('{ArrowRight}');
    expect(subContent().hidden).toBe(false);
    expect(subTrigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(itemByText('Deep'));
    await user.keyboard('{ArrowLeft}');
    expect(subContent().hidden).toBe(true);
    expect(document.activeElement).toBe(subTrigger());
  });

  // Open the level-1 (More) and level-2 (Even more) submenus from SSR markup.
  async function openTwoLevels(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    subTriggerByText('More').focus();
    await user.keyboard('{ArrowRight}');
    subTriggerByText('Even more').focus();
    await user.keyboard('{ArrowRight}');
    const grandchild = grandchildContent();
    expect(grandchild.hidden).toBe(false);
    return grandchild;
  }

  it('dismissing the whole menu collapses a NESTED (grandchild) submenu in the SSR path', async () => {
    const user = userEvent.setup();
    await mountWithSub();
    const grandchild = await openTwoLevels(user);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(content().hidden).toBe(true);
    expect(grandchild.hidden).toBe(true);
  });

  it('selecting a top-level item while a nested submenu is open collapses the grandchild', async () => {
    const user = userEvent.setup();
    await mountWithSub();
    const grandchild = await openTwoLevels(user);
    await user.click(itemByText('Cut'));
    expect(content().hidden).toBe(true);
    expect(grandchild.hidden).toBe(true);
  });
});
