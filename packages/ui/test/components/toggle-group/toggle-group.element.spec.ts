/**
 * WC performance of the toggle-group score, driven end to end against light-DOM
 * markup. Same score as the React spec -- the only difference is the
 * controller applies the projection imperatively via bindToggleGroup.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installIconLayout, ICON_SVG_16, rectsOf } from './icon-layout';
import { RaftersToggleGroup } from '../../../src/components/toggle-group/toggle-group.element';

beforeAll(() => {
  if (!customElements.get('rafters-toggle-group')) {
    customElements.define('rafters-toggle-group', RaftersToggleGroup);
  }
});

interface MountOptions {
  type?: 'single' | 'multiple';
  orientation?: 'horizontal' | 'vertical';
  pressed?: string[];
  disabled?: boolean;
  disabledItems?: string[];
}

function itemMarkup(value: string, label: string, pressed: boolean, disabled: boolean): string {
  const state = pressed ? 'on' : 'off';
  return `<button type="button" data-part="item" data-value="${value}" data-roving-item data-state="${state}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}>${label}</button>`;
}

async function mount(options: MountOptions = {}): Promise<HTMLElement> {
  const {
    type = 'single',
    orientation = 'horizontal',
    pressed = [],
    disabled = false,
    disabledItems = [],
  } = options;
  const items = [
    ['a', 'Alpha'],
    ['b', 'Beta'],
    ['c', 'Gamma'],
  ]
    .map(([value, label]) =>
      itemMarkup(
        value as string,
        label as string,
        pressed.includes(value as string),
        disabled || disabledItems.includes(value as string),
      ),
    )
    .join('');
  document.body.innerHTML = `
    <rafters-toggle-group>
      <div data-part="root" role="group" aria-label="Text formatting" data-type="${type}" data-orientation="${orientation}"${disabled ? ' data-disabled="true"' : ''}>
        ${items}
      </div>
    </rafters-toggle-group>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
}

const item = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('toggle-group [wc]', () => {
  it('reflects the server-rendered pressed item as the initial selection', async () => {
    await mount({ pressed: ['b'] });
    expect(item('b').getAttribute('aria-pressed')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('on');
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('single: click selects an item and reflects aria-pressed/data-state', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(item('b'));
    expect(item('b').getAttribute('aria-pressed')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('on');
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('single is collapsible: re-clicking the selected item clears it', async () => {
    const user = userEvent.setup();
    await mount({ pressed: ['a'] });
    await user.click(item('a'));
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
    expect(item('a').getAttribute('data-state')).toBe('off');
  });

  it('multiple: clicks add to the set', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple' });
    await user.click(item('a'));
    await user.click(item('c'));
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    expect(item('c').getAttribute('aria-pressed')).toBe('true');
    expect(item('b').getAttribute('aria-pressed')).toBe('false');
  });

  it('arrow keys move focus ONLY -- they do not toggle', async () => {
    const user = userEvent.setup();
    await mount();
    item('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item('b'));
    expect(item('b').getAttribute('aria-pressed')).toBe('false');
  });

  it('Space and Enter toggle the focused item', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple' });
    item('c').focus();
    await user.keyboard(' ');
    expect(item('c').getAttribute('aria-pressed')).toBe('true');
    item('a').focus();
    await user.keyboard('{Enter}');
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
  });

  it('roving skips a disabled item', async () => {
    const user = userEvent.setup();
    await mount({ disabledItems: ['b'] });
    item('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item('c'));
  });

  it('a disabled group gates toggling', async () => {
    const user = userEvent.setup();
    await mount({ disabled: true });
    await user.click(item('a'));
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('toggle-group icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  async function mountIcons(children = ''): Promise<HTMLElement> {
    document.body.innerHTML = `<rafters-toggle-group><div data-part="root" role="group" aria-label="Text formatting" data-type="single"><button type="button" data-part="item" data-value="a" data-roving-item data-state="off" aria-pressed="false">Alpha${children}</button></div></rafters-toggle-group>`;
    await Promise.resolve();
    await Promise.resolve();
    return item('a');
  }

  it('slot="start-icon" and slot="end-icon" children become hidden wrappers beside the label', async () => {
    const el = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span><span slot="end-icon">${ICON_SVG_16}</span>`,
    );
    expect(el.querySelector('[data-part="startIcon"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('[data-part="endIcon"]')?.getAttribute('aria-hidden')).toBe('true');
    const r = rectsOf(el);
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.label.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.label.right - 0.5);
    expect(r.start?.width).toBe(16);
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', async () => {
    document.documentElement.dir = 'rtl';
    const r = rectsOf(await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>`));
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('no wrapper without an icon child', async () => {
    const el = await mountIcons();
    expect(el.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(el.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
