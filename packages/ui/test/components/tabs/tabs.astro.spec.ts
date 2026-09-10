/**
 * Astro performance of the tabs score, driven end to end. AstroContainer renders
 * the SSR markup with the initial projection already applied, but does NOT run
 * the <script>, so the test calls bindTabs directly -- that IS the script's job
 * -- then drives the same score the React and WC performances drive. One score,
 * three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Tabs from '../../../src/components/tabs/tabs.astro';
import { bindTabs } from '../../../src/components/tabs/tabs.behavior';

const items = [
  { value: 'overview', label: 'Overview', content: 'Overview panel' },
  { value: 'details', label: 'Details', content: 'Details panel' },
  { value: 'history', label: 'History', content: 'History panel' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Tabs, {
    props: { id: 'demo', tabs: items, value: 'overview', ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"]') as HTMLElement;
  bindTabs(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const panel = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="panel"][data-value="${value}"]`)!;

describe('tabs conformance [astro]', () => {
  it('SSR: tablist + tabs + tabpanels with the seeded tab active', async () => {
    await mount({ value: 'details' });
    const list = document.body.querySelector('[data-part="list"]');
    expect(list?.getAttribute('role')).toBe('tablist');
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(trigger('details').getAttribute('role')).toBe('tab');
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
    expect(trigger('details').getAttribute('data-state')).toBe('active');
    expect(panel('details').getAttribute('role')).toBe('tabpanel');
    expect(panel('details').hasAttribute('hidden')).toBe(false);
    expect(panel('overview').hasAttribute('hidden')).toBe(true);
  });

  it('SSR: the trigger and its panel cross-reference each other by id', async () => {
    await mount();
    expect(trigger('overview').getAttribute('aria-controls')).toBe('demo-panel-overview');
    expect(panel('overview').getAttribute('aria-labelledby')).toBe('demo-tab-overview');
    expect(panel('overview').id).toBe('demo-panel-overview');
  });

  it('SSR: the active tab is the single tab stop before any JS runs', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Tabs, {
      props: { id: 'demo', tabs: items, value: 'history' },
    });
    document.body.innerHTML = html;
    expect(trigger('history').getAttribute('tabindex')).toBe('0');
    expect(trigger('overview').getAttribute('tabindex')).toBe('-1');
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
  });

  it('Space activates the focused tab via the native button', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('history').focus();
    await user.keyboard(' ');
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
  });

  it('a vertical axis reflects aria-orientation and moves with up/down arrows', async () => {
    const user = userEvent.setup();
    await mount({ orientation: 'vertical' });
    expect(
      document.body.querySelector('[data-part="list"]')?.getAttribute('aria-orientation'),
    ).toBe('vertical');
    trigger('overview').focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger('details').getAttribute('aria-selected')).toBe('true');
  });

  it('a disabled tab is skipped by roving', async () => {
    const user = userEvent.setup();
    await mount({
      tabs: [items[0], { ...items[1], disabled: true }, items[2]],
    });
    expect(trigger('details').hasAttribute('disabled')).toBe(true);
    trigger('overview').focus();
    await user.keyboard('{ArrowRight}');
    expect(trigger('history').getAttribute('aria-selected')).toBe('true');
  });
});
