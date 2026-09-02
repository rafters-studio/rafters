/**
 * React integration suite for BarChart (#2225): renders inside a real
 * ChartContainer, drives the composed observeResize primitive (stubbed
 * ResizeObserver, shared with the rest of the chart family), and asserts the
 * rendered SVG geometry matches computeBars -- proving the score and its
 * React performance agree, not just the score in isolation
 * (bar-chart.test.ts).
 */
import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartContainer } from '../../../src/components/chart/chart';
import { BarChart } from '../../../src/components/chart/bar-chart';
import { XAxis } from '../../../src/components/chart/x-axis';
import { computeBars } from '../../../src/components/chart/bar-chart.behavior';
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

/** Shared render shape for this suite: a ChartContainer/BarChart/XAxis tree
 *  differing only in `barProps` (series/layout/stacked). Extracted after
 *  simplify review flagged the identical JSX repeated across five tests. */
function renderBarChart(barProps: {
  data: typeof data;
  series: string[];
  layout?: 'vertical' | 'horizontal';
  stacked?: boolean;
}) {
  return render(
    <ChartContainer config={config}>
      <BarChart {...barProps}>
        <XAxis dataKey="month" />
      </BarChart>
    </ChartContainer>,
  );
}

describe('BarChart [react]', () => {
  it('renders root/plot/table parts and no bars before the plot has a measured size', () => {
    stubResizeObserver();
    const { container } = renderBarChart({ data, series: ['desktop', 'mobile'] });
    expect(container.querySelector('figure[data-part="root"]')).not.toBeNull();
    expect(container.querySelector('svg[data-part="plot"]')).not.toBeNull();
    expect(container.querySelector('[data-part="table"]')).not.toBeNull();
    // Before layout: width/height are 0x0 (ChartContainer's own initial
    // state), so computeBars degenerates to zero-extent bars, not an empty
    // array -- data is present, only the plot rectangle is not yet.
    expect(container.querySelectorAll('[data-part="bar"]').length).toBe(4);
  });

  it('rendered rect geometry matches computeBars once the plot is measured', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderBarChart({ data, series: ['desktop', 'mobile'] });
    act(() => {
      triggerResize([{ contentRect: { width: 300, height: 200 } }]);
    });

    const expected = computeBars({ data, series: ['desktop', 'mobile'] }, config, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    for (const bar of expected) {
      const rect = container.querySelector(`[data-part="bar"][data-bar-key="${bar.key}"]`);
      expect(rect, bar.key).not.toBeNull();
      expect(Number(rect?.getAttribute('x'))).toBeCloseTo(bar.x);
      expect(Number(rect?.getAttribute('y'))).toBeCloseTo(bar.y);
      expect(Number(rect?.getAttribute('width'))).toBeCloseTo(bar.width);
      expect(Number(rect?.getAttribute('height'))).toBeCloseTo(bar.height);
      expect(rect?.getAttribute('class')).toContain(bar.className);
    }
  });

  it('a resize recomputes geometry against the new plot size', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderBarChart({ data, series: ['desktop', 'mobile'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    const before = container.querySelector('[data-bar-key="Jan:desktop"]')?.getAttribute('height');

    act(() => triggerResize([{ contentRect: { width: 600, height: 400 } }]));
    const after = container.querySelector('[data-bar-key="Jan:desktop"]')?.getAttribute('height');

    expect(after).not.toBe(before);
  });

  it('stacked and horizontal props reach computeBars (grouped vertical is the default)', () => {
    const { triggerResize } = stubResizeObserver();
    const { container } = renderBarChart({
      data,
      series: ['desktop', 'mobile'],
      layout: 'horizontal',
      stacked: true,
    });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));

    const expected = computeBars({ data, series: ['desktop', 'mobile'] }, config, {
      categoryKey: 'month',
      width: 300,
      height: 200,
      layout: 'horizontal',
      stacked: true,
    });
    const janDesktop = container.querySelector('[data-bar-key="Jan:desktop"]');
    const expectedBar = expected.find((b) => b.key === 'Jan:desktop');
    expect(Number(janDesktop?.getAttribute('width'))).toBeCloseTo(expectedBar?.width ?? -1);
    expect(Number(janDesktop?.getAttribute('height'))).toBeCloseTo(expectedBar?.height ?? -1);
  });

  it('shadcn structural port: series maps to token, categoryKey lives on the composed XAxis child', () => {
    // shadcn's <BarChart data={data}><Bar dataKey="desktop" /></BarChart> ->
    // rafters' series prop; categoryKey never appears on BarChartConfig.
    const { triggerResize } = stubResizeObserver();
    const { container } = renderBarChart({ data, series: ['desktop'] });
    act(() => triggerResize([{ contentRect: { width: 300, height: 200 } }]));
    expect(container.querySelectorAll('[data-part="bar"]')).toHaveLength(2); // one per category
  });
});
