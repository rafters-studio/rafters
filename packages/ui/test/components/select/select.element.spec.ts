/**
 * WC performance of the select score, driven end to end against light-DOM
 * markup. Same score as the React performance -- the binding applies the
 * projection imperatively and runs the roving/typeahead/dismiss effects.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { page } from 'vitest/browser';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RaftersSelect } from '../../../src/components/select/select.element';
import {
  ICON_SVG_16,
  ICON_SVG_20,
  installIconLayout,
  itemRects,
  triggerRects,
} from './icon-layout';

beforeAll(() => {
  if (!customElements.get('rafters-select')) customElements.define('rafters-select', RaftersSelect);
});

function optionMarkup(v: string, label: string): string {
  return `<div role="option" data-part="item" data-value="${v}" data-roving-item tabindex="-1"><span></span><span>${label}</span></div>`;
}

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-select data-part="root" value="" ${attrs}>
      <button type="button" data-part="trigger" id="s-trigger">
        <div data-part="value" data-placeholder="Pick a fruit">Pick a fruit</div>
      </button>
      <div data-part="content" id="s-content" hidden>
        <div>
          ${optionMarkup('apple', 'Apple')}
          ${optionMarkup('banana', 'Banana')}
          ${optionMarkup('cherry', 'Cherry')}
        </div>
      </div>
    </rafters-select>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-select') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const valueEl = () => document.body.querySelector<HTMLElement>('[data-part="value"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('select [wc]', () => {
  it('closed: listbox hidden, trigger a collapsed combobox, aria wired by real ids', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(content().getAttribute('role')).toBe('listbox');
    expect(content().getAttribute('aria-labelledby')).toBe('s-trigger');
    expect(option('apple').getAttribute('aria-selected')).toBe('false');
  });

  it('click opens; clicking an option selects it, closes, updates the value, refocuses trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('s-content');

    await user.click(option('banana'));
    expect(content().hidden).toBe(true);
    expect(option('banana').getAttribute('aria-selected')).toBe('true');
    expect(valueEl().textContent).toBe('Banana');
    expect(document.activeElement).toBe(trigger());
  });

  it('ArrowDown on the trigger opens and lands focus on the first option', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(option('apple'));
  });

  it('arrows rove the options and Enter commits the focused one', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('banana'));
    await user.keyboard('{Enter}');
    expect(content().hidden).toBe(true);
    expect(option('banana').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(trigger());
  });

  it('typeahead jumps focus to the first matching option', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('c');
    expect(document.activeElement).toBe(option('cherry'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(true);
  });
});

describe('select icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  async function mountIcons(triggerHtml: string, appleExtra: string): Promise<HTMLElement> {
    document.body.innerHTML = `
      <rafters-select data-part="root" value="">
        <button type="button" data-part="trigger" id="s-trigger" aria-label="Fruit">
          ${triggerHtml}
        </button>
        <div data-part="content" id="s-content" data-state="open">
          <div>
            <div role="option" data-part="item" data-value="apple" data-roving-item tabindex="-1"><span></span><span>Apple</span>${appleExtra}</div>
            <div role="option" data-part="item" data-value="banana" data-roving-item tabindex="-1"><span></span><span>Banana</span></div>
          </div>
        </div>
      </rafters-select>`;
    await Promise.resolve();
    await Promise.resolve();
    return document.body.querySelector('rafters-select') as HTMLElement;
  }

  const valueHtml = '<div data-part="value" data-placeholder="Pick">Pick</div>';

  it('slotted trigger icons (start, end, both) become hidden wrappers beside the value', async () => {
    const icon = (slot: string, svg: string) => `<span slot="${slot}">${svg}</span>`;
    for (const [name, start, end] of [
      ['start', icon('start-icon', ICON_SVG_16), ''],
      ['end', '', icon('end-icon', ICON_SVG_20)],
      ['both', icon('start-icon', ICON_SVG_16), icon('end-icon', ICON_SVG_20)],
    ] as const) {
      const root = await mountIcons(`${start}${valueHtml}${end}`, '');
      const wrappers = root.querySelectorAll('[data-part="trigger"] > [data-icon]');
      expect(wrappers.length, name).toBe(name === 'both' ? 2 : 1);
      for (const w of wrappers) expect(w.getAttribute('aria-hidden'), name).toBe('true');
      const r = triggerRects(root);
      if (name !== 'end') {
        expect((r.start as DOMRect).right, name).toBeLessThanOrEqual(r.label.left + 0.5);
        expect(r.start?.width, name).toBe(16);
      }
      if (name !== 'start') {
        expect((r.end as DOMRect).left, name).toBeGreaterThanOrEqual(r.label.right - 0.5);
        expect(r.end?.width, name).toBe(20);
      }
    }
  });

  it('slotted item icons (start, end, both) sit beside the item text', async () => {
    const icon = (slot: string) => `<span slot="${slot}">${ICON_SVG_16}</span>`;
    for (const [name, extra] of [
      ['start', icon('start-icon')],
      ['end', icon('end-icon')],
      ['both', icon('start-icon') + icon('end-icon')],
    ] as const) {
      const root = await mountIcons(valueHtml, extra);
      const apple = root.querySelector('[data-value="apple"]') as HTMLElement;
      const r = itemRects(apple);
      if (name !== 'end') {
        expect((r.start as DOMRect).right, name).toBeLessThanOrEqual(r.label.left + 0.5);
      }
      if (name !== 'start') {
        expect((r.end as DOMRect).left, name).toBeGreaterThanOrEqual(r.label.right - 0.5);
      }
      for (const w of apple.querySelectorAll('[data-icon]')) {
        expect(w.getAttribute('aria-hidden'), name).toBe('true');
      }
    }
  });

  it('the option name is its label alone, whatever the icon svg titles say', async () => {
    await mountIcons(
      valueHtml,
      '<svg slot="start-icon" width="16" height="16"><title>Apple icon</title></svg>',
    );
    await expect
      .element(page.getByRole('option', { name: 'Apple', exact: true }))
      .toBeInTheDocument();
  });

  it('on a dir="rtl" page the start icon renders on the right of the value and the item text', async () => {
    document.documentElement.dir = 'rtl';
    const root = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span>${valueHtml}`,
      `<span slot="start-icon">${ICON_SVG_16}</span>`,
    );
    const t = triggerRects(root);
    expect((t.start as DOMRect).left).toBeGreaterThan(t.label.left);
    const i = itemRects(root.querySelector('[data-value="apple"]') as HTMLElement);
    expect((i.start as DOMRect).left).toBeGreaterThan(i.label.left);
  });

  it('no wrapper without an icon child', async () => {
    const root = await mountIcons(valueHtml, '');
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
