/**
 * Astro performance of the context-menu score, driven end to end. AstroContainer
 * renders the SSR markup with the initial (closed) projection already applied,
 * but does NOT run the <script>, so the test calls bindContextMenu directly --
 * that IS the script's job -- then drives the same score the React and WC
 * performances drive. The SSR markup is wrapped in a <main> landmark so axe's
 * best-practice region rule holds for the menu (asserted by
 * context-menu.astro.a11y.ts, not here).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ContextMenu from '../../../src/components/context-menu/context-menu.astro';
import { contextMenuClasses } from '../../../src/components/context-menu/context-menu.classes';
import {
  bindContextMenu,
  contextMenu,
  type ContextMenuConfig,
  type ContextMenuPart,
  type ContextMenuState,
} from '../../../src/components/context-menu/context-menu.behavior';

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

/** The element carrying data-part="<part>". */
function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly ContextMenuPart[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part present (with its declared role) and the rendered
 *  ARIA equal to the score's projection -- including absence: a projected
 *  `undefined` means the attribute must not be rendered. */
function assertAriaContract(
  root: HTMLElement,
  state: ContextMenuState,
  config: ContextMenuConfig,
  expectedParts: readonly ContextMenuPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = contextMenu.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }

  const allParts = Object.keys(contextMenu.parts) as ContextMenuPart[];
  const ids = domPartIds(root, allParts);
  const projection = contextMenu.aria(state, config, ids);

  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/**
 * The markup/behavior pairing (#2001): config reaches a DOM-native binding as
 * `data-*` and nothing else. Asserts BOTH halves on one root, so a half-fix
 * (markup renamed, behavior still on getAttribute, or the reverse) fails
 * loudly instead of rendering fine and silently not rehydrating.
 */
function assertConfigTravelsAsData(
  root: HTMLElement,
  expected: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(expected)) {
    expect(root.dataset[key], `dataset.${key}`).toBe(value);
    const bare = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(root.hasAttribute(bare), `bare attribute "${bare}" must not be rendered`).toBe(false);
  }
}

describe('context-menu conformance [astro]', () => {
  it('the SSR markup carries the class strings the resolver computes', async () => {
    // The Astro lane emits its markup ahead of any binding, so this proves the
    // resolver's output reaches the server-rendered nodes rather than being
    // applied later by the enhancer.
    const root = await mount();
    const classes = contextMenuClasses();
    const content = root.querySelector('[data-part="content"]') as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.className).toBe(classes.content);
    const items = root.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const expected = item.hasAttribute('aria-haspopup') ? classes.subTrigger : classes.item;
      expect(item.className).toBe(expected);
    }
  });

  it('SSR closed: content present-but-hidden, items in the DOM', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(content().getAttribute('data-state')).toBe('closed');
    expect(content().querySelectorAll('[role="menuitem"]').length).toBe(4);
  });

  it('per-part ARIA equals the score projection, closed (SSR) and open', async () => {
    await mount();
    assertAriaContract(
      document.body,
      { open: false, x: 0, y: 0 },
      { loop: true, avoidCollisions: true },
      ['trigger', 'content'],
    );
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    assertAriaContract(
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
    // Never `hidden` (#2152): sub-content's presence is CSS opacity/scale over
    // `:hover`/`:focus-within` and `data-state`, not display:none.
    expect(subContent().getAttribute('data-state')).toBe('closed');
    subTrigger().focus();
    await user.keyboard('{ArrowRight}');
    expect(subContent().getAttribute('data-state')).toBe('open');
    expect(subTrigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(itemByText('Deep'));
    await user.keyboard('{ArrowLeft}');
    expect(subContent().getAttribute('data-state')).toBe('closed');
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
    expect(grandchild.getAttribute('data-state')).toBe('open');
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
    expect(grandchild.getAttribute('data-state')).toBe('closed');
  });

  it('selecting a top-level item while a nested submenu is open collapses the grandchild', async () => {
    const user = userEvent.setup();
    await mountWithSub();
    const grandchild = await openTwoLevels(user);
    await user.click(itemByText('Cut'));
    expect(content().hidden).toBe(true);
    expect(grandchild.getAttribute('data-state')).toBe('closed');
  });

  // The #2001 pairing: config is data-* in the markup AND read through dataset
  // in the bind. Neither `loop` nor `avoid-collisions` is valid on a <div>.
  it('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
    const root = await mount();

    assertConfigTravelsAsData(root, { loop: 'true', avoidCollisions: 'true' });

    // Rehydration: the contextmenu wiring exists only because bindContextMenu
    // built its config from dataset alone.
    fireEvent.contextMenu(trigger(), { clientX: 12, clientY: 22 });
    expect(content().hidden).toBe(false);
    expect(content().getAttribute('data-state')).toBe('open');
  });
});
