/**
 * WC performance of the context-menu icons, in real chromium so geometry is
 * measured (the happy-dom suite in context-menu.element.test.ts has no layout).
 * The author puts a child with slot="start-icon" inside an item; the host wraps
 * it in the decorative part the behavior projects aria-hidden onto, and wraps
 * the item's text in the label part the row grid places.
 */
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ICON_SVG_16, installIconLayout, rect } from './icon-layout';
import { RaftersContextMenu } from '../../../src/components/context-menu/context-menu.element';

beforeAll(() => {
  if (!customElements.get('rafters-context-menu')) {
    customElements.define('rafters-context-menu', RaftersContextMenu);
  }
});

const slotted = ICON_SVG_16.replace('<svg', '<svg slot="start-icon"');

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-context-menu>
        <span data-part="trigger" tabindex="-1" id="cm-trigger">Right-click here</span>
        <div data-part="content" role="menu" aria-label="Actions" id="cm-content" data-state="open">
          <div role="menuitem">${slotted}Cut</div>
          <div role="menuitem">Copy</div>
          <div data-part="sub" id="cm-sub">
            <div data-part="sub-trigger" role="menuitem" tabindex="-1" id="cm-sub-trigger">${slotted}More</div>
            <div data-part="sub-content" role="menu" aria-label="More" id="cm-sub-content" data-state="closed">
              <div role="menuitem">${slotted}Deep</div>
            </div>
          </div>
        </div>
      </rafters-context-menu>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const itemByLabel = (text: string): HTMLElement => {
  const match = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (el) => el.querySelector(':scope > [data-part="label"]')?.textContent === text,
  );
  if (!match) throw new Error(`no item ${text}`);
  return match;
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('context-menu icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  it('wraps each slotted icon in an aria-hidden wrapper before the item label', async () => {
    await mount();
    const wrappers = document.body.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(3);
    for (const wrapper of wrappers) {
      expect(wrapper.getAttribute('aria-hidden')).toBe('true');
      expect(wrapper.getAttribute('data-icon')).toBe('inline-start');
      expect(wrapper.querySelector('[slot]')).toBeNull();
    }
    expect(itemByLabel('Copy').querySelector('[data-part="startIcon"]')).toBeNull();
    for (const name of ['Cut', 'More']) {
      const item = itemByLabel(name);
      const icon = rect(item, '[data-part="startIcon"]');
      const label = rect(item, '[data-part="label"]');
      expect(icon.right, name).toBeLessThanOrEqual(label.left + 0.5);
    }
  });

  it('on a dir="rtl" page the start icon renders on the right of the label; size is kept', async () => {
    document.documentElement.dir = 'rtl';
    await mount();
    const item = itemByLabel('Cut');
    const icon = rect(item, '[data-part="startIcon"]');
    const label = rect(item, '[data-part="label"]');
    expect(icon.left).toBeGreaterThan(label.left);
    expect(icon.width).toBe(16);
  });

  it('no wrapper is made when no icon is given', async () => {
    document.body.innerHTML = `
      <main>
        <rafters-context-menu>
          <span data-part="trigger" tabindex="-1" id="cm-trigger">Right-click here</span>
          <div data-part="content" role="menu" aria-label="Actions" id="cm-content" data-state="closed">
            <div role="menuitem">Cut</div>
          </div>
        </rafters-context-menu>
      </main>`;
    await Promise.resolve();
    expect(document.body.querySelector('[data-part="startIcon"]')).toBeNull();
  });
});
