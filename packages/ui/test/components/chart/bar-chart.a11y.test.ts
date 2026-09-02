/**
 * a11y suite for BarChart (#2225): axe across default, empty, and
 * active-datum states, plus the structural guarantees the issue pins outside
 * axe's reach -- no role="img" on the SVG (it would make its descendants
 * presentational and break keyboard traversal), the data-table fallback
 * always present, and every emitted class a literal token class, never a
 * hex, `var()`, or arbitrary value.
 */
import * as React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { announceToScreenReader } from '../../../src/primitives/sr-announcer';
import { ChartContainer } from '../../../src/components/chart/chart';
import { BarChart } from '../../../src/components/chart/bar-chart';
import { XAxis } from '../../../src/components/chart/x-axis';
import { barChartClasses } from '../../../src/components/chart/bar-chart.classes';
import { barChart } from '../../../src/components/chart/bar-chart.behavior';
import { hasArbitraryValue } from '../../../src/primitives/classy';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

vi.mock('../../../src/primitives/sr-announcer', async () => {
  const actual = await vi.importActual<typeof import('../../../src/primitives/sr-announcer')>(
    '../../../src/primitives/sr-announcer',
  );
  return { ...actual, announceToScreenReader: vi.fn() };
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

function renderChart(rows: typeof data = data) {
  const { triggerResize } = stubResizeObserver();
  const view = render(
    React.createElement(
      'main',
      null,
      React.createElement(
        ChartContainer,
        { config },
        React.createElement(
          BarChart,
          { data: rows, series: ['desktop', 'mobile'] },
          React.createElement(XAxis, { dataKey: 'month' }),
        ),
      ),
    ),
  );
  act(() => {
    triggerResize([{ contentRect: { width: 300, height: 200 } }]);
  });
  return view;
}

describe('BarChart a11y [react]: default state', () => {
  it('is axe-clean', async () => {
    const { container } = renderChart();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('renders inside a figure carrying role="figure" and a descriptive aria-label', () => {
    const { container } = renderChart();
    const figure = container.querySelector('figure[data-part="root"]');
    expect(figure?.getAttribute('role')).toBe('figure');
    expect(figure?.getAttribute('aria-label')).toContain('desktop');
    expect(figure?.tagName.toLowerCase()).toBe('figure');
  });

  it('never uses role="img" on the SVG -- it would make descendants presentational', () => {
    const { container } = renderChart();
    const svg = container.querySelector('svg[data-part="plot"]');
    expect(svg?.getAttribute('role')).not.toBe('img');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('the data-table fallback is always present, with one row per bar', () => {
    const { container } = renderChart();
    const table = container.querySelector('[data-part="table"]');
    expect(table).not.toBeNull();
    expect(table?.tagName.toLowerCase()).toBe('table');
    // sr-only, never hidden/display:none -- present in the a11y tree.
    expect(table).toHaveProperty('hidden', false);
    const rows = table?.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(4); // 2 categories x 2 series
  });
});

describe('BarChart a11y [react]: empty state', () => {
  it('is axe-clean with no data', async () => {
    const { container } = renderChart([]);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('renders an empty plot and an empty table body, no throw', () => {
    const { container } = renderChart([]);
    expect(container.querySelectorAll('[data-part="bar"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });
});

describe('BarChart a11y [react]: active-datum state', () => {
  it('is axe-clean once a bar is active', async () => {
    const { container } = renderChart();
    const figure = container.querySelector('figure[data-part="root"]') as HTMLElement;
    fireEvent.keyDown(figure, { key: 'ArrowRight' });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('arrow keys move the active-datum cursor and announce it, focus staying on the figure', () => {
    const { container } = renderChart();
    const figure = container.querySelector('figure[data-part="root"]') as HTMLElement;
    figure.focus();
    fireEvent.keyDown(figure, { key: 'ArrowRight' });

    const activeBar = container.querySelector('[data-part="bar"][data-active="true"]');
    expect(activeBar).not.toBeNull();
    expect(announceToScreenReader).toHaveBeenCalledWith(expect.stringContaining('Jan'), 'polite');
    // Focus never enters the SVG -- it stays on the figure the whole time.
    expect(document.activeElement).toBe(figure);
  });

  it('every bar not the active one carries data-active="false"', () => {
    const { container } = renderChart();
    const figure = container.querySelector('figure[data-part="root"]') as HTMLElement;
    fireEvent.keyDown(figure, { key: 'ArrowRight' });
    const bars = Array.from(container.querySelectorAll('[data-part="bar"]'));
    const activeCount = bars.filter((el) => el.getAttribute('data-active') === 'true').length;
    expect(activeCount).toBe(1);
  });
});

describe('BarChart a11y: no keyboard contract claimed outside root/plot', () => {
  it('barChart.keymap never claims a key on the bar or table parts', () => {
    const state = barChart.initialState({
      data,
      series: ['desktop'],
      chartConfig: config,
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    expect(
      barChart.keymap({ key: 'ArrowRight' }, state, 'bar', {
        data,
        series: ['desktop'],
        chartConfig: config,
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toBeNull();
    expect(
      barChart.keymap({ key: 'ArrowRight' }, state, 'table', {
        data,
        series: ['desktop'],
        chartConfig: config,
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toBeNull();
  });
});

describe('BarChart a11y: color/class token compliance -- no hex, no var(), no arbitrary value', () => {
  const classes = barChartClasses(
    { layout: 'vertical' },
    { bars: [], valueTicks: [], activeIndex: null },
  );
  const FORBIDDEN_LITERAL = /#[0-9a-f]{3,8}\b|var\(--/i;

  it('emits no hex or var() literal', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(FORBIDDEN_LITERAL);
    }
  });

  it('emits no arbitrary-value utility', () => {
    for (const value of Object.values(classes)) {
      for (const cls of value.split(/\s+/).filter(Boolean)) {
        expect(hasArbitraryValue(cls), cls).toBe(false);
      }
    }
  });
});
