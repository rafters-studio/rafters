/**
 * WC performance of the context-menu score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the only difference is the
 * controller applies the projection imperatively. The markup sits inside a
 * <main> landmark so axe's best-practice region rule holds for the menu.
 */
import { cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { contextMenu } from '../../../src/components/context-menu/context-menu.behavior';
import { RaftersContextMenu } from '../../../src/components/context-menu/context-menu.element';
import { assertAxeClean, assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-context-menu')) {
    customElements.define('rafters-context-menu', RaftersContextMenu);
  }
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-context-menu>
        <span data-part="trigger" tabindex="-1" id="cm-trigger">Right-click here</span>
        <div data-part="content" role="menu" aria-label="Actions" id="cm-content" data-state="closed" style="position: fixed; left: 0; top: 0;">
          <div role="menuitem">Cut</div>
          <div role="menuitem">Copy</div>
          <div role="menuitem" data-disabled aria-disabled="true">Paste</div>
          <div role="menuitem">Delete</div>
          <div data-part="sub" id="cm-sub">
            <div data-part="sub-trigger" role="menuitem" tabindex="-1" id="cm-sub-trigger">More</div>
            <div data-part="sub-content" role="menu" aria-label="More" id="cm-sub-content" data-state="closed" style="position: fixed; left: 0; top: 0;">
              <div role="menuitem">Deep</div>
              <div role="menuitem">Deeper</div>
            </div>
          </div>
        </div>
      </rafters-context-menu>
    </main>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-context-menu') as HTMLElement;
}

const trigger = () =>
  document.body.querySelector<HTMLElement>('[data-part="trigger"]') as HTMLElement;
const content = () =>
  document.body.querySelector<HTMLElement>('[data-part="content"]') as HTMLElement;
const itemByText = (text: string): HTMLElement => {
  const match = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (element) => element.textContent === text,
  );
  if (!match) throw new Error(`no item ${text}`);
  return match;
};

// The bind portals an open submenu's content to document.body (escaping the
// parent overflow and roving scope). In happy-dom a `hidden` attribute is not
// collapsed to display:none, so a closed sub-content there would trip axe's
// best-practice region rule that a real browser skips. Scope axe to the <main>
// landmark, which contains the menu; the portaled node sits outside it.
const landmark = () => document.body.querySelector('main') as HTMLElement;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('context-menu conformance [wc]', () => {
  it('closed: content hidden, trigger collapsed, axe-clean', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(content().getAttribute('data-state')).toBe('closed');
    expect(trigger().getAttribute('data-state')).toBe('closed');
    await assertAxeClean(landmark());
  });

  it('right-click opens at the pointer point, focus lands on the first item', async () => {
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 30, clientY: 50 });
    expect(content().hidden).toBe(false);
    expect(content().getAttribute('data-state')).toBe('open');
    expect(content().style.left).toBe('30px');
    expect(content().style.top).toBe('50px');
    expect(document.activeElement).toBe(itemByText('Cut'));
    await assertAxeClean(landmark());
  });

  it('the rendered ARIA equals the score projection when open', async () => {
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    assertContractFulfillment(
      contextMenu,
      document.body,
      { open: true, x: 10, y: 10 },
      { loop: true, avoidCollisions: true },
      ['trigger', 'content'],
    );
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    expect(content().hidden).toBe(false);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    expect(content().hidden).toBe(false);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(content().hidden).toBe(true);
  });

  it('arrow keys rove focus, skipping the disabled item', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    expect(document.activeElement).toBe(itemByText('Cut'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(itemByText('Copy'));
    await user.keyboard('{ArrowDown}');
    // Paste is disabled -- roving skips it and lands on Delete.
    expect(document.activeElement).toBe(itemByText('Delete'));
  });

  it('selecting an item closes the menu', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    await user.click(itemByText('Copy'));
    expect(content().hidden).toBe(true);
  });

  it('ArrowRight opens a submenu and ArrowLeft closes it back to the sub-trigger', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.body.querySelector<HTMLElement>('[data-part="sub-trigger"]') as HTMLElement;
    const sc = document.body.querySelector<HTMLElement>('[data-part="sub-content"]') as HTMLElement;
    expect(sc.hidden).toBe(true);
    st.focus();
    await user.keyboard('{ArrowRight}');
    expect(sc.hidden).toBe(false);
    expect(st.getAttribute('aria-expanded')).toBe('true');
    expect(st.getAttribute('aria-controls')).toBe('cm-sub-content');
    expect(document.activeElement).toBe(itemByText('Deep'));
    await user.keyboard('{ArrowLeft}');
    expect(sc.hidden).toBe(true);
    expect(document.activeElement).toBe(st);
  });

  it('closing the whole menu collapses an open submenu', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.body.querySelector<HTMLElement>('[data-part="sub-trigger"]') as HTMLElement;
    const sc = document.body.querySelector<HTMLElement>('[data-part="sub-content"]') as HTMLElement;
    st.focus();
    await user.keyboard('{ArrowRight}');
    expect(sc.hidden).toBe(false);
    await user.keyboard('{Escape}');
    // Escape in the submenu closes the submenu first, back to the sub-trigger.
    expect(sc.hidden).toBe(true);
    expect(document.activeElement).toBe(st);
  });
});
