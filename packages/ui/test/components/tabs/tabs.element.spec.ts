/**
 * WC performance of the tabs score, driven end to end against light-DOM markup.
 * Same score as the React spec -- the only difference is the
 * controller applies the projection imperatively via bindTabs.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installIconLayout, ICON_SVG_16, rectsOf } from './icon-layout';
import { RaftersTabs } from '../../../src/components/tabs/tabs.element';

beforeAll(() => {
  if (!customElements.get('rafters-tabs')) {
    customElements.define('rafters-tabs', RaftersTabs);
  }
});

const VALUES = ['overview', 'details', 'history'] as const;

interface MountOptions {
  active?: string;
  orientation?: 'horizontal' | 'vertical';
  disabledTabs?: string[];
}

async function mount(options: MountOptions = {}): Promise<HTMLElement> {
  const { active = 'overview', orientation = 'horizontal', disabledTabs = [] } = options;
  const triggers = VALUES.map((value) => {
    const on = value === active;
    const disabled = disabledTabs.includes(value) ? ' disabled' : '';
    return `<button type="button" role="tab" data-part="trigger" data-value="${value}" id="t-tab-${value}" aria-controls="t-panel-${value}" aria-selected="${on}" data-state="${on ? 'active' : 'inactive'}"${disabled}>${value}</button>`;
  }).join('');
  const panels = VALUES.map((value) => {
    const on = value === active;
    return `<div role="tabpanel" data-part="panel" data-value="${value}" id="t-panel-${value}" aria-labelledby="t-tab-${value}" tabindex="0" data-state="${on ? 'active' : 'inactive'}"${on ? '' : ' hidden'}>${value} panel</div>`;
  }).join('');
  document.body.innerHTML = `
    <rafters-tabs>
      <div data-part="root">
        <div data-part="list" role="tablist" aria-orientation="${orientation}">${triggers}</div>
        ${panels}
      </div>
    </rafters-tabs>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const panel = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="panel"][data-value="${value}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('tabs [wc]', () => {
  it('reflects the server-rendered active trigger as the initial selection', async () => {
    await mount({ active: 'details' });
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
    expect(trigger('details').getAttribute('data-state')).toBe('active');
    expect(trigger('overview').getAttribute('aria-selected')).toBe('false');
    expect(panel('details').hasAttribute('hidden')).toBe(false);
    expect(panel('overview').hasAttribute('hidden')).toBe(true);
  });

  it('click activates a tab and swaps the visible panel', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('history'));
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
    expect(trigger('history').getAttribute('data-state')).toBe('active');
    expect(panel('history').hasAttribute('hidden')).toBe(false);
    expect(panel('overview').hasAttribute('hidden')).toBe(true);
  });

  it('arrow keys move focus AND activate the newly focused tab', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('overview').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('details'));
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
    expect(panel('details').hasAttribute('hidden')).toBe(false);
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(trigger('overview'));
    expect(trigger('overview').getAttribute('aria-selected')).toBe('true');
  });

  it('Home and End jump to the first and last tab and activate them', async () => {
    const user = userEvent.setup();
    await mount({ active: 'details' });
    trigger('details').focus();
    await user.keyboard('{End}');
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Home}');
    expect(trigger('overview').getAttribute('aria-selected')).toBe('true');
  });

  it('a vertical axis moves with up/down arrows', async () => {
    const user = userEvent.setup();
    await mount({ orientation: 'vertical' });
    trigger('overview').focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
  });

  it('Space and Enter activate the focused tab via the native button', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('details').focus();
    await user.keyboard(' ');
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
    trigger('history').focus();
    await user.keyboard('{Enter}');
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
  });

  it('roving skips a disabled tab', async () => {
    const user = userEvent.setup();
    await mount({ disabledTabs: ['details'] });
    trigger('overview').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('history'));
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys pressed inside a panel do NOT move the tabs', async () => {
    const user = userEvent.setup();
    await mount();
    panel('overview').focus();
    await user.keyboard('{ArrowRight}');
    // Roving binds to the tablist, not the root, so panel content keeps its
    // own arrow keys (text navigation, nested widgets).
    expect(trigger('overview').getAttribute('aria-selected')).toBe('true');
    expect(trigger('details').getAttribute('aria-selected')).toBe('false');
  });

  it('Tab enters the set at the active tab, not the first (seeded roving index)', async () => {
    await mount({ active: 'history' });
    expect(trigger('history').getAttribute('tabindex')).toBe('0');
    expect(trigger('overview').getAttribute('tabindex')).toBe('-1');
    expect(trigger('details').getAttribute('tabindex')).toBe('-1');
  });
});

describe('tabs icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => {
    document.body.innerHTML = '';
    uninstall();
  });

  async function mountIcons(inner: string): Promise<HTMLElement> {
    document.body.innerHTML = `
      <rafters-tabs>
        <div data-part="root">
          <div data-part="list" role="tablist" aria-orientation="horizontal">
            <button type="button" role="tab" data-part="trigger" data-value="a" id="t-tab-a" aria-controls="t-panel-a" aria-selected="true" data-state="active">${inner}</button>
          </div>
          <div role="tabpanel" data-part="panel" data-value="a" id="t-panel-a" aria-labelledby="t-tab-a" tabindex="0" data-state="active">A panel</div>
        </div>
      </rafters-tabs>`;
    await Promise.resolve();
    return document.querySelector('[data-part="trigger"]') as HTMLElement;
  }

  it('slot="start-icon" and slot="end-icon" children become hidden wrappers beside the label', async () => {
    const trigger = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span>Overview<span slot="end-icon">${ICON_SVG_16}</span>`,
    );
    expect(trigger.querySelector('[data-part="startIcon"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(trigger.querySelector('[data-part="endIcon"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const r = rectsOf(trigger);
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.label.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.label.right - 0.5);
    expect(r.start?.width).toBe(16);
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', async () => {
    document.documentElement.dir = 'rtl';
    const trigger = await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>Overview`);
    const r = rectsOf(trigger);
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('no wrapper without an icon child', async () => {
    const trigger = await mountIcons('Overview');
    expect(trigger.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(trigger.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
