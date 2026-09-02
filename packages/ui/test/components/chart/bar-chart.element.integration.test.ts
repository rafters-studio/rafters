/**
 * WC integration suite for BarChart (#2225), driven end to end against
 * light-DOM markup nested inside a ChartContainer -- proving the
 * data-config JSON transport (chart.astro/#2224's pin), the DOM-native
 * `bindBarChart` client's imperative bar/table-row creation (bar geometry
 * has no fixed markup for a light-DOM enhancer to merely toggle, unlike the
 * static XAxis/YAxis/CartesianGrid elements), and the ChartContainer-size ->
 * BarChart-geometry propagation via MutationObserver on
 * data-chart-width/height (bar-chart.behavior.ts reads the ancestor's
 * dataset rather than re-observing the plot itself). The container's size is
 * driven through its OWN bind (`stubResizeObserver`/`triggerResize`), not by
 * hand-setting its dataset -- ChartContainer's `bindChart` republishes its
 * own state onto that dataset on every render, so a hand-set value would be
 * clobbered back to 0x0 the moment its bind's first render fires.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaftersChartContainer } from '../../../src/components/chart/chart.element';
import { RaftersXAxis } from '../../../src/components/chart/x-axis.element';
import { RaftersBarChart } from '../../../src/components/chart/bar-chart.element';
import { computeBars } from '../../../src/components/chart/bar-chart.behavior';
import { resolveBarFillClass } from '../../../src/components/chart/bar-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

beforeAll(() => {
  if (!customElements.get('rafters-chart-container')) {
    customElements.define('rafters-chart-container', RaftersChartContainer);
  }
  if (!customElements.get('rafters-x-axis')) customElements.define('rafters-x-axis', RaftersXAxis);
  if (!customElements.get('rafters-bar-chart')) {
    customElements.define('rafters-bar-chart', RaftersBarChart);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const chartConfig = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

const barChartConfig = { data, series: ['desktop', 'mobile'] };

function markup(barConfig: unknown = barChartConfig): string {
  return `
    <rafters-chart-container data-part="root" data-config='${JSON.stringify(chartConfig)}'>
      <div data-part="plot">
        <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
        <rafters-bar-chart data-part="root" data-config='${JSON.stringify(barConfig)}'>
          <svg data-part="plot"></svg>
          <table data-part="table"><tbody></tbody></table>
        </rafters-bar-chart>
      </div>
    </rafters-chart-container>`;
}

/** happy-dom delivers MutationObserver callbacks on a macrotask, not a
 *  microtask (confirmed empirically: a mutation observed with
 *  `attributeFilter` only reaches its callback after a `setTimeout(0)`
 *  flush, never after any number of `await Promise.resolve()`s). Real
 *  browsers queue it as a compound microtask instead, so this flush is a
 *  test-environment accommodation, not a statement about production timing. */
function flushMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Mount both custom elements, size the ChartContainer through its own
 *  ResizeObserver stub (never by hand-setting its dataset), and flush both
 *  binds: the deferred connectedCallback microtask, then the
 *  MutationObserver callback bar-chart's bind attaches to the
 *  ChartContainer's dataset. */
async function mount(
  width: number,
  height: number,
  barConfig: unknown = barChartConfig,
): Promise<{
  containerRoot: HTMLElement;
  barChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  document.body.innerHTML = markup(barConfig);
  await Promise.resolve(); // deferred connectedCallback binds (both elements)
  triggerResize([{ contentRect: { width, height } }]); // ChartContainer's own bind sets its dataset
  await flushMutationObserver();

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const barChartRoot = document.body.querySelector('rafters-bar-chart') as HTMLElement;
  return { containerRoot, barChartRoot, triggerResize };
}

describe('bar-chart [wc]', () => {
  it('round-trips BarChartConfig through the data-config JSON attribute', async () => {
    const { barChartRoot } = await mount(300, 200);
    expect(barChartRoot.getAttribute('data-config')).toBe(JSON.stringify(barChartConfig));
  });

  it('creates one <rect data-part="bar"> per computeBars entry, matching its geometry', async () => {
    const { barChartRoot } = await mount(300, 200);
    const expected = computeBars({ data, series: ['desktop', 'mobile'] }, chartConfig, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    const rects = barChartRoot.querySelectorAll('[data-part="bar"]');
    expect(rects).toHaveLength(expected.length);
    for (const bar of expected) {
      const rect = barChartRoot.querySelector(`[data-bar-key="${bar.key}"]`);
      expect(rect, bar.key).not.toBeNull();
      expect(Number(rect?.getAttribute('x'))).toBeCloseTo(bar.x);
      expect(Number(rect?.getAttribute('height'))).toBeCloseTo(bar.height);
      expect(rect?.getAttribute('class')).toContain(resolveBarFillClass(chartConfig, bar));
    }
  });

  it('populates the data-table fallback tbody with one row per bar', async () => {
    const { barChartRoot } = await mount(300, 200);
    const rows = barChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[0]?.textContent).toContain('Jan');
  });

  it('root carries role=figure and a descriptive aria-label; svg is aria-hidden, never role=img', async () => {
    const { barChartRoot } = await mount(300, 200);
    expect(barChartRoot.getAttribute('role')).toBe('figure');
    expect(barChartRoot.getAttribute('aria-label')).toContain('desktop');
    const svg = barChartRoot.querySelector('[data-part="plot"]');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).not.toBe('img');
  });

  it('a resize of the ChartContainer ancestor recomputes bar geometry', async () => {
    const { barChartRoot, triggerResize } = await mount(300, 200);
    const before = barChartRoot
      .querySelector('[data-bar-key="Jan:desktop"]')
      ?.getAttribute('height');

    triggerResize([{ contentRect: { width: 600, height: 400 } }]);
    await flushMutationObserver();

    const after = barChartRoot
      .querySelector('[data-bar-key="Jan:desktop"]')
      ?.getAttribute('height');
    expect(after).not.toBe(before);
  });

  it('arrow keys move the active-datum cursor, flagging exactly one bar data-active', async () => {
    const { barChartRoot } = await mount(300, 200);
    barChartRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const active = barChartRoot.querySelectorAll('[data-active="true"]');
    expect(active).toHaveLength(1);
  });

  it('an empty data-config renders no bars and no rows, without throwing', async () => {
    const { barChartRoot } = await mount(300, 200, { data: [], series: ['desktop'] });
    expect(barChartRoot.querySelectorAll('[data-part="bar"]')).toHaveLength(0);
    expect(barChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });
});
