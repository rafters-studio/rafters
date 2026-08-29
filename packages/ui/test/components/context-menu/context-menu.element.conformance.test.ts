/**
 * WC performance of the context-menu score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the only difference is the
 * controller applies the projection imperatively. The markup sits inside a
 * <main> landmark so axe's best-practice region rule holds for the menu.
 */
import { cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
              <div data-part="sub" id="cm-sub2">
                <div data-part="sub-trigger" role="menuitem" tabindex="-1" id="cm-sub2-trigger">Even more</div>
                <div data-part="sub-content" role="menu" aria-label="Even more" id="cm-sub2-content" data-state="closed" style="position: fixed; left: 0; top: 0;">
                  <div role="menuitem">Grandchild</div>
                </div>
              </div>
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

// The bind portals a submenu's sub-content to document.body on mount (escaping
// the parent overflow and roving scope), open or closed -- unlike the parent
// menu's `content`, sub-content is never `hidden` (#2152: a hidden node cannot
// transition, and the CSS reveal must survive with JS off). Scope axe to the
// <main> landmark, which contains the menu; the portaled node sits outside it.
//
// This scoping is ONLY for axe's best-practice region rule, which flags any
// content sitting outside a landmark whether or not it is visible or
// interactive -- a real browser skips that rule, and it would fire on the
// portaled node regardless of its open/closed state. But the tradeoff is
// real: because the portaled sub-content sits outside <main>, a
// `landmark()`-scoped axe run never reaches it, so it cannot be the
// regression guard for a closed sub-content's accessibility-tree exclusion
// (`aria-hidden="true"`, projected by the score and mirrored in the SSR
// markup, #2187 review). That guard is the explicit `aria-hidden` /
// `tabindex` assertions in the open/close/axe-clean test below, plus a
// second `assertAxeClean` call there scoped directly to the sub-content
// node so axe actually scans the portaled element.
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
    expect(sc.getAttribute('data-state')).toBe('closed');
    st.focus();
    await user.keyboard('{ArrowRight}');
    expect(sc.getAttribute('data-state')).toBe('open');
    expect(st.getAttribute('aria-expanded')).toBe('true');
    expect(st.getAttribute('aria-controls')).toBe('cm-sub-content');
    expect(document.activeElement).toBe(itemByText('Deep'));
    await user.keyboard('{ArrowLeft}');
    expect(sc.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(st);
  });

  // #2152: the hover-intent delay is a CSS `transition-delay`
  // (`delay-hover-intent` in context-menu.classes.ts), never a JS timer -- so
  // pointer hover flips `data-state` the instant the event fires, with
  // `setTimeout` never scheduled for it.
  it('opens and closes the submenu on pointer hover with no JS timer', async () => {
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.getElementById('cm-sub-trigger') as HTMLElement;
    const sc = document.getElementById('cm-sub-content') as HTMLElement;
    const spy = vi.spyOn(globalThis, 'setTimeout');
    spy.mockClear();
    fireEvent.pointerEnter(st);
    expect(spy).not.toHaveBeenCalled();
    expect(sc.getAttribute('data-state')).toBe('open');
    spy.mockClear();
    fireEvent.pointerLeave(st);
    expect(spy).not.toHaveBeenCalled();
    expect(sc.getAttribute('data-state')).toBe('closed');
    spy.mockRestore();
  });

  // #2187 review: a pointer hover is the only input `delay-hover-intent`
  // should filter (accidental transit); a click or keyboard open has already
  // declared intent and must stay instant (acceptance criterion 6: keyboard
  // navigation unchanged). `data-open-source` is what the CSS reveal rule
  // (context-menu.classes.ts) reads to tell the two apart.
  it('a pointer hover marks data-open-source="pointer"; ArrowRight marks it "discrete"', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.getElementById('cm-sub-trigger') as HTMLElement;
    const sc = document.getElementById('cm-sub-content') as HTMLElement;

    fireEvent.pointerEnter(st);
    expect(sc.getAttribute('data-open-source')).toBe('pointer');
    fireEvent.pointerLeave(st);
    expect(sc.hasAttribute('data-open-source')).toBe(false);

    st.focus();
    await user.keyboard('{ArrowRight}');
    expect(sc.getAttribute('data-state')).toBe('open');
    expect(sc.getAttribute('data-open-source')).toBe('discrete');
  });

  // #2187 review: dropping `hidden` from sub-content (needed so it can
  // transition) leaves a closed panel a live `role="menu"` node with
  // `role="menuitem"` children in the accessibility tree unless something
  // else marks it hidden from AT. `aria-hidden` does that without collapsing
  // layout (the CSS reveal and transition are untouched by it). The
  // discriminating check is axe AFTER an open/close cycle, not just at
  // mount: roving-focus leaves one item at `tabindex="0"` when it tears
  // down, which would be a focusable descendant of an aria-hidden container
  // (axe's aria-hidden-focus rule) if that tabindex were not also reset.
  it('closed sub-content is aria-hidden with every item back at tabindex="-1", and stays axe-clean after an open/close cycle', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.getElementById('cm-sub-trigger') as HTMLElement;
    const sc = document.getElementById('cm-sub-content') as HTMLElement;
    expect(sc.getAttribute('aria-hidden')).toBe('true');

    st.focus();
    await user.keyboard('{ArrowRight}'); // open -- roving-focus puts tabindex="0" on Deep
    expect(sc.getAttribute('aria-hidden')).toBeNull();
    expect(sc.querySelector('[role="menuitem"]')?.getAttribute('tabindex')).toBe('0');
    await user.keyboard('{ArrowLeft}'); // close back to the sub-trigger

    expect(sc.getAttribute('aria-hidden')).toBe('true');
    for (const item of sc.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
      expect(item.getAttribute('tabindex')).toBe('-1');
    }
    // landmark() only covers the top-level menu content inside <main> --
    // the portalled sub-content sits outside it and is invisible to this
    // scan (see the comment on `landmark()` above). Scan the sub-content
    // node directly so a regressed `aria-hidden` or a leftover
    // `tabindex="0"` on it is actually caught by axe, not just by the
    // explicit assertions above.
    await assertAxeClean(landmark());
    await assertAxeClean(sc);
  });

  it('closing the whole menu collapses an open submenu', async () => {
    const user = userEvent.setup();
    await mount();
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const st = document.getElementById('cm-sub-trigger') as HTMLElement;
    const sc = document.getElementById('cm-sub-content') as HTMLElement;
    st.focus();
    await user.keyboard('{ArrowRight}');
    expect(sc.getAttribute('data-state')).toBe('open');
    await user.keyboard('{Escape}');
    // Escape in the submenu closes the submenu first, back to the sub-trigger.
    expect(sc.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(st);
  });

  // Open the level-1 submenu (Sub A) and its nested level-2 submenu (Sub A.1).
  async function openTwoLevels(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    (document.getElementById('cm-sub-trigger') as HTMLElement).focus();
    await user.keyboard('{ArrowRight}');
    (document.getElementById('cm-sub2-trigger') as HTMLElement).focus();
    await user.keyboard('{ArrowRight}');
    const grandchild = document.getElementById('cm-sub2-content') as HTMLElement;
    expect(grandchild.getAttribute('data-state')).toBe('open');
    return grandchild;
  }

  it('dismissing the whole menu collapses a NESTED (grandchild) submenu, not just one level', async () => {
    const user = userEvent.setup();
    await mount();
    const grandchild = await openTwoLevels(user);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(content().hidden).toBe(true);
    expect(grandchild.getAttribute('data-state')).toBe('closed');
  });

  it('selecting a top-level item while a nested submenu is open collapses the grandchild', async () => {
    const user = userEvent.setup();
    await mount();
    const grandchild = await openTwoLevels(user);
    await user.click(itemByText('Cut'));
    expect(content().hidden).toBe(true);
    expect(grandchild.getAttribute('data-state')).toBe('closed');
  });
});
