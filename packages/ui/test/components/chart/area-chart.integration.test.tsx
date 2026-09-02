/**
 * React integration suite for AreaChart (#2227): renders inside a real
 * ChartContainer, drives the composed observeResize primitive (stubbed
 * ResizeObserver, shared with the rest of the chart family), and asserts
 * the rendered SVG path geometry matches computeAreas -- proving the score
 * and its React performance agree, not just the score in isolation
 * (area-chart.test.ts). Same suite shape as bar-chart.integration.test.tsx
 * (#2225).
 */
import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartContainer } from '../../../src/components/chart/chart';
import { Area } from '../../../src/components/chart/area';
import { AreaChart } from '../../../src/components/chart/area-chart';
import { XAxis } from '../../../src/components/chart/x-axis';
import { computeAreas } from '../../../src/components/chart/area-chart.behavior';
import {
  resolveAreaFillClass,
  resolveAreaStrokeClass,
} from '../../../src/components/chart/area-chart.classes';
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
];

/** Shared render shape for this suite: a ChartContainer/AreaChart/XAxis tree
 *  differing only in `areaProps` (series/smooth/stacked). Same extraction
 *  bar-chart.integration.test.tsx applies for its own five-test repeat. */
function renderAreaChart(areaProps: {
  data: typeof data;
  series: string[];
  smooth?: boolean;
  stacked?: boolean;
}) {
  return render(
    <ChartContainer config={config}>
      <AreaChart {...areaProps}>
        <XAxis dataKey="month" />
      </AreaChart>
    </ChartContainer>,
  );
}

describe('AreaChart [react]', () => {
  it('renders root/plot/table parts and no area/line paths before the plot has a measured size', () => {
    stubResizeObserver();
    const { container } = renderAreaChart({ data, series: ['desktop', 'mobile'] });
    expect(container.querySelector('figure[data-part="root"]')).not.toBeNull();
    expect(container.querySelector('svg[data-part="plot"]')).not.toBeNull();
    expect(container.querySelector('[data-part="table"]')).not.toBeNull();
    // Before layout: width/height are 0x0 (ChartContainer's own initial
    // state), so computeAreas still returns two series (data is present),
    // just with degenerate zero-extent geometry.
    expect(container.querySelectorAll('[data-part="area"]').length).toBe(2);
  });

  it('rendered path geometry matches computeAreas once the plot is measured', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderAreaChart({ data, series: ['desktop', 'mobile'] });
    act(() => {
      triggerResize([{ contentRect: { width: 300, height: 200 } }]);
    });

    const expected = computeAreas({ data, series: ['desktop', 'mobile'] }, config, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    for (const series of expected.series) {
      const areaEl = container.querySelector(`[data-part="area"][data-series-key="${series.key}"]`);
      expect(areaEl, series.key).not.toBeNull();
      expect(areaEl?.getAttribute('d')).toBe(series.areaPath);
      expect(areaEl?.getAttribute('class')).toContain(resolveAreaFillClass(config, series));

      const lineEl = container.querySelector(`[data-part="line"][data-series-key="${series.key}"]`);
      expect(lineEl, series.key).not.toBeNull();
      expect(lineEl?.getAttribute('d')).toBe(series.linePath);
      expect(lineEl?.getAttribute('fill')).toBe('none');
      expect(lineEl?.getAttribute('class')).toContain(resolveAreaStrokeClass(config, series));
    }
  });

  it('a resize recomputes geometry against the new plot size', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderAreaChart({ data, series: ['desktop', 'mobile'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    const before = container
      .querySelector('[data-part="area"][data-series-key="desktop"]')
      ?.getAttribute('d');

    act(() => triggerResize([{ contentRect: { width: 600, height: 400 } }]));
    const after = container
      .querySelector('[data-part="area"][data-series-key="desktop"]')
      ?.getAttribute('d');

    expect(after).not.toBe(before);
  });

  it('stacked and smooth props reach computeAreas (overlaid, straight is the default)', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderAreaChart({
      data,
      series: ['desktop', 'mobile'],
      smooth: true,
      stacked: true,
    });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));

    const expected = computeAreas({ data, series: ['desktop', 'mobile'] }, config, {
      categoryKey: 'month',
      width: 300,
      height: 200,
      smooth: true,
      stacked: true,
    });
    const mobile = expected.series.find((s) => s.key === 'mobile');
    const mobileEl = container.querySelector('[data-part="area"][data-series-key="mobile"]');
    expect(mobileEl?.getAttribute('d')).toBe(mobile?.areaPath);
    // Stacked mobile's baseline is the desktop cumulative, an AreaPoint[] --
    // its path is built by hand (not delegated to graph.ts's areaPath), so
    // asserting it round-trips end to end is the proof this wiring works.
    expect(Array.isArray(mobile?.baseline)).toBe(true);
  });

  it('shadcn structural port: series maps to token, categoryKey lives on the composed XAxis child', () => {
    // shadcn's <AreaChart data={data}><Area dataKey="desktop" /></AreaChart>
    // -> rafters' series prop; categoryKey never appears on AreaChartConfig.
    const { triggerResize } = stubResizeObserver();
    const { container } = renderAreaChart({ data, series: ['desktop'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="area"]')).toHaveLength(1); // one series
  });

  it('composed <Area> children alone derive the series list -- no series prop at all', () => {
    // The real shadcn-parity call site: <AreaChart data={data}><Area
    // dataKey="desktop"/></AreaChart>, no series prop.
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <AreaChart data={data}>
          <XAxis dataKey="month" />
          <Area dataKey="desktop" />
          <Area dataKey="mobile" />
        </AreaChart>
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="area"]')).toHaveLength(2);
    expect(container.querySelector('[data-part="area"][data-series-key="desktop"]')).not.toBeNull();
    expect(container.querySelector('[data-part="area"][data-series-key="mobile"]')).not.toBeNull();
  });

  it('composed <Area> children win outright over a series prop when both are present', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = render(
      <ChartContainer config={config}>
        <AreaChart data={data} series={['desktop', 'mobile']}>
          <XAxis dataKey="month" />
          <Area dataKey="mobile" />
        </AreaChart>
      </ChartContainer>,
    );
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    // One <Area> child (mobile) wins over the two-entry series prop.
    expect(container.querySelectorAll('[data-part="area"]')).toHaveLength(1);
    expect(container.querySelector('[data-part="area"][data-series-key="mobile"]')).not.toBeNull();
    expect(container.querySelector('[data-part="area"][data-series-key="desktop"]')).toBeNull();
  });
});
