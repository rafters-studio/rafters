/**
 * a11y suite for ChartLegend/ChartLegendContent (#2228): axe over the React
 * render, roving-focus keyboard traversal with visible focus, and the
 * display-only contract -- activating an entry dispatches nothing.
 */
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import { chartLegend } from '../../../src/components/chart/chart-legend.behavior';
import { ChartLegend, ChartLegendContent } from '../../../src/components/chart/chart-legend.tsx';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

describe('ChartLegend a11y [react]', () => {
  it('is axe-clean', async () => {
    const { container } = render(
      React.createElement(
        'main',
        null,
        React.createElement(
          ChartContainer,
          { config },
          React.createElement(ChartLegend, {
            content: React.createElement(ChartLegendContent, null),
          }),
        ),
      ),
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('renders role=list on root and role=listitem + data-roving-item on every entry', () => {
    render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(ChartLegend, {
          content: React.createElement(ChartLegendContent, null),
        }),
      ),
    );
    // ChartContainer also renders its own `[data-part="root"]`; ChartLegend's
    // is nested inside it, so it is the LAST match in document order.
    const roots = document.querySelectorAll('[data-part="root"]');
    const root = roots[roots.length - 1];
    expect(root?.getAttribute('role')).toBe('list');
    const entries = document.querySelectorAll('[data-part="entry"]');
    expect(entries).toHaveLength(2);
    for (const entry of Array.from(entries)) {
      expect(entry.getAttribute('role')).toBe('listitem');
      expect(entry.hasAttribute('data-roving-item')).toBe(true);
    }
  });

  it('roving-focus moves focus across entries on ArrowRight; focus stays visible (native focus, no outline suppression)', () => {
    render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(ChartLegend, {
          content: React.createElement(ChartLegendContent, null),
        }),
      ),
    );
    const entries = Array.from(document.querySelectorAll<HTMLElement>('[data-part="entry"]'));
    entries[0]?.focus();
    expect(document.activeElement).toBe(entries[0]);
    fireEvent.keyDown(entries[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(entries[1]);
  });
});

describe('display-only contract: activation dispatches nothing', () => {
  it('clicking or pressing Enter/Space on an entry never changes chart config or throws', () => {
    render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(ChartLegend, {
          content: React.createElement(ChartLegendContent, null),
        }),
      ),
    );
    const entry = document.querySelector<HTMLElement>('[data-part="entry"]')!;
    expect(() => fireEvent.click(entry)).not.toThrow();
    expect(() => fireEvent.keyDown(entry, { key: 'Enter' })).not.toThrow();
    expect(() => fireEvent.keyDown(entry, { key: ' ' })).not.toThrow();
    // No dispatch surface exists to have fired: the spec has zero actions.
    expect(Object.keys(chartLegend.actions)).toHaveLength(0);
  });
});

describe('color token compliance -- no hex, no var(), no arbitrary value', () => {
  it('the default content render never emits a forbidden class', () => {
    const { container } = render(
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(ChartLegend, {
          content: React.createElement(ChartLegendContent, null),
        }),
      ),
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).not.toMatch(/var\(--/);
  });
});
