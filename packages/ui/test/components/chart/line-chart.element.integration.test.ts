/**
 * WC integration suite for LineChart (#2226), driven end to end against
 * light-DOM markup nested inside a ChartContainer -- proving the
 * data-config JSON transport (chart.astro/#2224's pin), the DOM-native
 * `bindLineChart` client's imperative path/dot/table-row creation (line/point
 * geometry has no fixed markup for a light-DOM enhancer to merely toggle,
 * unlike the static XAxis/YAxis/CartesianGrid elements), and the
 * ChartContainer-size -> LineChart-geometry propagation via MutationObserver
 * on data-chart-width/height, same shape bar-chart.element.integration.test.ts
 * already proves for Bar.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaftersChartContainer } from '../../../src/components/chart/chart.element';
import { RaftersXAxis } from '../../../src/components/chart/x-axis.element';
import { RaftersLine } from '../../../src/components/chart/line.element';
import { RaftersLineChart } from '../../../src/components/chart/line-chart.element';
import { computeDots, computeLinePoints } from '../../../src/components/chart/line-chart.behavior';
import {
  resolveDotFillClass,
  resolveLineStrokeClass,
} from '../../../src/components/chart/line-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

beforeAll(() => {
  if (!customElements.get('rafters-chart-container')) {
    customElements.define('rafters-chart-container', RaftersChartContainer);
  }
  if (!customElements.get('rafters-x-axis')) customElements.define('rafters-x-axis', RaftersXAxis);
  if (!customElements.get('rafters-line')) customElements.define('rafters-line', RaftersLine);
  if (!customElements.get('rafters-line-chart')) {
    customElements.define('rafters-line-chart', RaftersLineChart);
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

const lineChartConfig = { data, series: ['desktop', 'mobile'] };

function markup(
  lineConfig: unknown = lineChartConfig,
  lineChildKeys: string[] = [],
  withXAxis = true,
): string {
  const lineChildren = lineChildKeys
    .map((key) => `<rafters-line data-part="series" data-key="${key}" hidden></rafters-line>`)
    .join('\n');
  const xAxis = withXAxis
    ? '<rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>'
    : '';
  return `
    <rafters-chart-container data-part="root" data-config='${JSON.stringify(chartConfig)}'>
      <div data-part="plot">
        ${xAxis}
        <rafters-line-chart data-part="root" data-config='${JSON.stringify(lineConfig)}'>
          ${lineChildren}
          <svg data-part="plot"></svg>
          <table data-part="table"><tbody></tbody></table>
        </rafters-line-chart>
      </div>
    </rafters-chart-container>`;
}

/** happy-dom delivers MutationObserver callbacks on a macrotask, same
 *  accommodation bar-chart.element.integration.test.ts documents. */
function flushMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mount(
  width: number,
  height: number,
  lineConfig: unknown = lineChartConfig,
  lineChildKeys: string[] = [],
  withXAxis = true,
): Promise<{
  containerRoot: HTMLElement;
  lineChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  document.body.innerHTML = markup(lineConfig, lineChildKeys, withXAxis);
  await Promise.resolve(); // deferred connectedCallback binds (both elements)
  triggerResize([{ contentRect: { width, height } }]); // ChartContainer's own bind sets its dataset
  await flushMutationObserver();

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const lineChartRoot = document.body.querySelector('rafters-line-chart') as HTMLElement;
  return { containerRoot, lineChartRoot, triggerResize };
}

describe('line-chart [wc]', () => {
  it('round-trips LineChartConfig through the data-config JSON attribute', async () => {
    const { lineChartRoot } = await mount(300, 200);
    expect(lineChartRoot.getAttribute('data-config')).toBe(JSON.stringify(lineChartConfig));
  });

  it('creates one <path data-part="line"> per series and one <circle data-part="point"> per datum, matching computeLinePoints', async () => {
    const { lineChartRoot } = await mount(300, 200);
    const expected = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width: 300, height: 200 },
    );
    const paths = lineChartRoot.querySelectorAll('[data-part="line"]');
    expect(paths).toHaveLength(2);
    for (const dot of computeDots(expected)) {
      const circle = lineChartRoot.querySelector(`[data-point-key="${dot.key}"]`);
      expect(circle, dot.key).not.toBeNull();
      expect(Number(circle?.getAttribute('cx'))).toBeCloseTo(dot.x);
      expect(Number(circle?.getAttribute('cy'))).toBeCloseTo(dot.y);
      expect(circle?.getAttribute('class')).toContain(resolveDotFillClass(chartConfig, dot));
    }
    const desktopPath = lineChartRoot.querySelector('[data-series-key="desktop"]');
    expect(desktopPath?.getAttribute('class')).toContain(
      resolveLineStrokeClass(chartConfig, { series: 'desktop', seriesIndex: 0 }),
    );
  });

  it('populates the data-table fallback tbody with one row per datum', async () => {
    const { lineChartRoot } = await mount(300, 200);
    const rows = lineChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[0]?.textContent).toContain('Jan');
  });

  it('root carries role=figure and a descriptive aria-label; svg is aria-hidden, never role=img', async () => {
    const { lineChartRoot } = await mount(300, 200);
    expect(lineChartRoot.getAttribute('role')).toBe('figure');
    expect(lineChartRoot.getAttribute('aria-label')).toContain('desktop');
    const svg = lineChartRoot.querySelector('[data-part="plot"]');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).not.toBe('img');
  });

  it('a resize of the ChartContainer ancestor recomputes line/point geometry', async () => {
    const { lineChartRoot, triggerResize } = await mount(300, 200);
    const before = lineChartRoot.querySelector('[data-series-key="desktop"]')?.getAttribute('d');

    triggerResize([{ contentRect: { width: 600, height: 400 } }]);
    await flushMutationObserver();

    const after = lineChartRoot.querySelector('[data-series-key="desktop"]')?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('arrow keys move the active-datum cursor, flagging exactly one point data-active', async () => {
    const { lineChartRoot } = await mount(300, 200);
    lineChartRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const active = lineChartRoot.querySelectorAll('[data-active="true"]');
    expect(active).toHaveLength(1);
  });

  it('an empty data-config renders no lines, no points, and no rows, without throwing', async () => {
    const { lineChartRoot } = await mount(300, 200, { data: [], series: ['desktop'] });
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(0);
    expect(lineChartRoot.querySelectorAll('[data-part="point"]')).toHaveLength(0);
    expect(lineChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });

  it('composed <rafters-line> children alone derive the series list -- no series in data-config', async () => {
    const { lineChartRoot } = await mount(300, 200, { data }, ['desktop', 'mobile']);
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(2);
    expect(lineChartRoot.querySelector('[data-series-key="desktop"]')).not.toBeNull();
    expect(lineChartRoot.querySelector('[data-series-key="mobile"]')).not.toBeNull();
  });

  it('composed <rafters-line> children win outright over data-config series when both are present', async () => {
    const { lineChartRoot } = await mount(300, 200, lineChartConfig, ['mobile']);
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(1);
    expect(lineChartRoot.querySelector('[data-series-key="mobile"]')).not.toBeNull();
    expect(lineChartRoot.querySelector('[data-series-key="desktop"]')).toBeNull();
  });

  it('dots: false in data-config suppresses point markers', async () => {
    const { lineChartRoot } = await mount(300, 200, { data, series: ['desktop'], dots: false });
    expect(lineChartRoot.querySelectorAll('[data-part="point"]')).toHaveLength(0);
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(1);
  });

  it('axis-less by omission: no rafters-x-axis sibling -> Sparkline aria-label, points still spread', async () => {
    const { lineChartRoot } = await mount(
      120,
      40,
      { data, series: ['desktop'] },
      [],
      false, // withXAxis: false
    );
    expect(lineChartRoot.getAttribute('aria-label')).toMatch(/^Sparkline of/);
    const xs = Array.from(lineChartRoot.querySelectorAll('[data-part="point"]')).map((el) =>
      Number(el.getAttribute('cx')),
    );
    expect(new Set(xs).size).toBe(2); // spread by row index, never collapsed to one x
  });
});
