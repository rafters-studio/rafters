/**
 * React integration suite for LineChart (#2226): renders inside a real
 * ChartContainer, drives the composed observeResize primitive (stubbed
 * ResizeObserver, shared with the rest of the chart family), and asserts the
 * rendered SVG geometry matches computeLinePoints -- proving the score and
 * its React performance agree, not just the score in isolation
 * (line-chart.test.ts).
 */
import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartContainer } from '../../../src/components/chart/chart';
import { Line } from '../../../src/components/chart/line';
import { LineChart } from '../../../src/components/chart/line-chart';
import { XAxis } from '../../../src/components/chart/x-axis';
import { YAxis } from '../../../src/components/chart/y-axis';
import { CartesianGrid } from '../../../src/components/chart/cartesian-grid';
import {
  buildSeriesPath,
  computeDots,
  computeLinePoints,
} from '../../../src/components/chart/line-chart.behavior';
import {
  resolveDotFillClass,
  resolveLineStrokeClass,
} from '../../../src/components/chart/line-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
  { month: 'Mar', desktop: 90, mobile: 50 },
];

function renderLineChart(lineProps: {
  data: typeof data;
  series?: string[];
  smooth?: boolean;
  dots?: boolean;
  children?: React.ReactNode;
}) {
  return render(
    <ChartContainer config={config}>
      <LineChart {...lineProps}>
        <XAxis dataKey="month" />
        {lineProps.children}
      </LineChart>
    </ChartContainer>,
  );
}

describe('LineChart [react]', () => {
  it('renders root/plot/table parts before the plot has a measured size', () => {
    stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop', 'mobile'] });
    expect(container.querySelector('figure[data-part="root"]')).not.toBeNull();
    expect(container.querySelector('svg[data-part="plot"]')).not.toBeNull();
    expect(container.querySelector('[data-part="table"]')).not.toBeNull();
  });

  it('rendered path/dot geometry matches computeLinePoints once the plot is measured', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop', 'mobile'] });
    act(() => {
      triggerResize([{ contentRect: { width: 300, height: 200 } }]);
    });

    const expected = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width: 300, height: 200 },
    );
    const desktopPoints = expected.filter((p) => p.series === 'desktop');
    const desktopPath = container.querySelector('[data-part="line"][data-series-key="desktop"]');
    expect(desktopPath?.getAttribute('d')).toBe(buildSeriesPath(desktopPoints, { smooth: false }));
    expect(desktopPath?.getAttribute('class')).toContain(
      resolveLineStrokeClass(config, desktopPoints[0] ?? { series: 'desktop', seriesIndex: 0 }),
    );

    for (const dot of computeDots(expected)) {
      const circle = container.querySelector(`[data-part="point"][data-point-key="${dot.key}"]`);
      expect(circle, dot.key).not.toBeNull();
      expect(Number(circle?.getAttribute('cx'))).toBeCloseTo(dot.x);
      expect(Number(circle?.getAttribute('cy'))).toBeCloseTo(dot.y);
      expect(circle?.getAttribute('class')).toContain(resolveDotFillClass(config, dot));
    }
  });

  it('smooth builds a monotone-cubic path instead of straight segments', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop'], smooth: true });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    const path = container.querySelector('[data-part="line"][data-series-key="desktop"]');
    expect(path?.getAttribute('d')).toContain('C');
  });

  it('dots={false} renders no point markers', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop'], dots: false });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="point"]')).toHaveLength(0);
  });

  it('a resize recomputes geometry against the new plot size', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    const before = container
      .querySelector('[data-part="line"][data-series-key="desktop"]')
      ?.getAttribute('d');

    act(() => triggerResize([{ contentRect: { width: 600, height: 400 } }]));
    const after = container
      .querySelector('[data-part="line"][data-series-key="desktop"]')
      ?.getAttribute('d');

    expect(after).not.toBe(before);
  });

  it('shadcn structural port: series maps to token, categoryKey lives on the composed XAxis child', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderLineChart({ data, series: ['desktop'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="line"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-part="point"]')).toHaveLength(3); // one per row
  });

  it('composed <Line> children alone derive the series list -- no series prop at all', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <Line dataKey="desktop" />
          <Line dataKey="mobile" />
        </LineChart>
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="line"]')).toHaveLength(2);
    expect(container.querySelector('[data-series-key="desktop"]')).not.toBeNull();
    expect(container.querySelector('[data-series-key="mobile"]')).not.toBeNull();
  });

  it('composed <Line> children win outright over a series prop when both are present', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <LineChart data={data} series={['desktop', 'mobile']}>
          <XAxis dataKey="month" />
          <Line dataKey="mobile" />
        </LineChart>
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="line"]')).toHaveLength(1);
    expect(container.querySelector('[data-series-key="mobile"]')).not.toBeNull();
    expect(container.querySelector('[data-series-key="desktop"]')).toBeNull();
  });

  it('axis-less by omission: no XAxis/YAxis/CartesianGrid children -> Sparkline label, points still spread', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <LineChart data={data} series={['desktop']} />
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 120, height: 40 } }]));
    const figure = container.querySelector('figure[data-part="root"]');
    expect(figure?.getAttribute('aria-label')).toMatch(/^Sparkline of/);
    const xs = Array.from(container.querySelectorAll('[data-part="point"]')).map((el) =>
      Number(el.getAttribute('cx')),
    );
    expect(new Set(xs).size).toBe(3); // spread by row index, never collapsed to one x
  });

  it('composing XAxis/YAxis/CartesianGrid switches the label to "Line chart"', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <LineChart data={data} series={['desktop']}>
          <CartesianGrid />
          <XAxis dataKey="month" />
          <YAxis />
        </LineChart>
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    const figure = container.querySelector('figure[data-part="root"]');
    expect(figure?.getAttribute('aria-label')).toMatch(/^Line chart of/);
  });
});
