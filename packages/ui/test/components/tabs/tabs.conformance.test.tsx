/**
 * React performance of the tabs score, driven end to end. Activation moves only
 * through dispatched actions; roving focus is composed from the primitive; arrow
 * keys move focus AND activate the newly focused tab (automatic activation).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../src/components/tabs/tabs';
import { tabs, type TabsConfig } from '../../../src/components/tabs/tabs.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  disabledTabs?: string[];
}

function TestTabs({ disabledTabs = [], ...props }: SetupProps) {
  return (
    <Tabs {...props}>
      <TabsList aria-label="Account views">
        <TabsTrigger value="overview" disabled={disabledTabs.includes('overview')}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="details" disabled={disabledTabs.includes('details')}>
          Details
        </TabsTrigger>
        <TabsTrigger value="history" disabled={disabledTabs.includes('history')}>
          History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="details">Details panel</TabsContent>
      <TabsContent value="history">History panel</TabsContent>
    </Tabs>
  );
}

const body = () => document.body;

function triggerFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
  if (!element) throw new Error(`no trigger for ${value}`);
  return element;
}

function panelFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="panel"][data-value="${value}"]`);
  if (!element) throw new Error(`no panel for ${value}`);
  return element;
}

afterEach(() => {
  cleanup();
});

describe('tabs conformance [react]', () => {
  it('renders a tablist with tabs and tabpanels, axe-clean', async () => {
    // Wrapped in a landmark: a tablist is not itself a landmark, and axe's
    // best-practice `region` rule flags page content outside one.
    render(
      <main>
        <TestTabs defaultValue="overview" />
      </main>,
    );
    expect(partElement(body(), 'list')?.getAttribute('role')).toBe('tablist');
    expect(partElement(body(), 'list')?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(triggerFor('overview').getAttribute('role')).toBe('tab');
    expect(panelFor('overview').getAttribute('role')).toBe('tabpanel');
    await assertAxeClean(body());
  });

  it('contract: the part and instance projections equal the rendered DOM', () => {
    const config: TabsConfig = {
      value: undefined,
      defaultValue: 'details',
      orientation: 'horizontal',
    };
    render(<TestTabs defaultValue="details" />);
    const root = partElement(body(), 'root');
    if (!root) throw new Error('no root');
    const state = tabs.initialState(config);
    assertContractFulfillment(tabs, root, state, config, ['root', 'list', 'trigger', 'panel']);
    assertInstanceAriaFulfillment(tabs, root, state, config);
  });

  it('the trigger and its panel cross-reference each other by id', () => {
    render(<TestTabs defaultValue="overview" />);
    expect(triggerFor('overview').getAttribute('aria-controls')).toBe(panelFor('overview').id);
    expect(panelFor('overview').getAttribute('aria-labelledby')).toBe(triggerFor('overview').id);
  });

  it('shows only the active panel and hides the rest', () => {
    render(<TestTabs defaultValue="details" />);
    expect(panelFor('details').hasAttribute('hidden')).toBe(false);
    expect(panelFor('overview').hasAttribute('hidden')).toBe(true);
    expect(panelFor('history').hasAttribute('hidden')).toBe(true);
  });

  it('click activates a tab, swaps the panel, and fires onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <main>
        <TestTabs defaultValue="overview" onValueChange={onValueChange} />
      </main>,
    );
    await user.click(triggerFor('details'));
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('true');
    expect(triggerFor('details').getAttribute('data-state')).toBe('active');
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('false');
    expect(panelFor('details').hasAttribute('hidden')).toBe(false);
    expect(panelFor('overview').hasAttribute('hidden')).toBe(true);
    expect(onValueChange).toHaveBeenCalledWith('details');
    await assertAxeClean(body());
  });

  it('re-clicking the active tab does NOT deactivate it or re-fire the callback', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestTabs defaultValue="overview" onValueChange={onValueChange} />);
    await user.click(triggerFor('overview'));
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('true');
    expect(panelFor('overview').hasAttribute('hidden')).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('arrow keys move focus AND activate the newly focused tab', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestTabs defaultValue="overview" onValueChange={onValueChange} />);
    triggerFor('overview').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(triggerFor('details'));
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('true');
    expect(panelFor('details').hasAttribute('hidden')).toBe(false);
    expect(onValueChange).toHaveBeenLastCalledWith('details');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(triggerFor('overview'));
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('true');
  });

  it('Home and End jump to the first and last tab and activate them', async () => {
    const user = userEvent.setup();
    render(<TestTabs defaultValue="details" />);
    triggerFor('details').focus();
    await user.keyboard('{End}');
    expect(triggerFor('history').getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Home}');
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('true');
  });

  it('a vertical axis moves with up/down arrows and reflects aria-orientation', async () => {
    const user = userEvent.setup();
    render(<TestTabs defaultValue="overview" orientation="vertical" />);
    expect(partElement(body(), 'list')?.getAttribute('aria-orientation')).toBe('vertical');
    triggerFor('overview').focus();
    await user.keyboard('{ArrowDown}');
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('true');
  });

  it('Space and Enter activate the focused tab via the native button', async () => {
    const user = userEvent.setup();
    render(<TestTabs defaultValue="overview" />);
    triggerFor('details').focus();
    await user.keyboard(' ');
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('true');
    triggerFor('history').focus();
    await user.keyboard('{Enter}');
    expect(triggerFor('history').getAttribute('aria-selected')).toBe('true');
  });

  it('controlled: state follows the prop, callback reports the value to set', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestTabs value="overview" onValueChange={onValueChange} />);
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('true');

    // A controlled set's effective value does not move on click, but the
    // callback still reports what to set.
    await user.click(triggerFor('details'));
    expect(onValueChange).toHaveBeenLastCalledWith('details');
    expect(triggerFor('overview').getAttribute('aria-selected')).toBe('true');
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('false');

    rerender(<TestTabs value="details" onValueChange={onValueChange} />);
    expect(triggerFor('details').getAttribute('aria-selected')).toBe('true');
    expect(panelFor('details').hasAttribute('hidden')).toBe(false);
  });

  it('roving skips a disabled tab', async () => {
    const user = userEvent.setup();
    render(<TestTabs defaultValue="overview" disabledTabs={['details']} />);
    expect(triggerFor('details').hasAttribute('disabled')).toBe(true);
    triggerFor('overview').focus();
    await user.keyboard('{ArrowRight}');
    // details is disabled, so focus and activation jump to history.
    expect(document.activeElement).toBe(triggerFor('history'));
    expect(triggerFor('history').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps exactly one trigger in the tab order (roving tabindex)', () => {
    render(<TestTabs defaultValue="details" />);
    const tabbable = ['overview', 'details', 'history'].filter(
      (value) => triggerFor(value).getAttribute('tabindex') === '0',
    );
    // Tab enters the set at the tab whose panel is showing, not at the first.
    expect(tabbable).toEqual(['details']);
  });
});
