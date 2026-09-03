/**
 * WC integration suite for AreaChart (#2227), driven end to end against
 * light-DOM markup nested inside a ChartContainer -- proving the
 * data-config JSON transport (chart.astro/#2224's pin), the DOM-native
 * `bindAreaChart` client's imperative area/line/table-row creation (area
 * geometry has no fixed markup for a light-DOM enhancer to merely toggle,
 * unlike the static XAxis/YAxis/CartesianGrid elements), and the
 * ChartContainer-size -> AreaChart-geometry propagation via MutationObserver
 * on data-chart-width/height. Same suite shape as
 * bar-chart.element.integration.test.ts (#2225).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaftersChartContainer } from '../../../src/components/chart/chart.element';
import { RaftersXAxis } from '../../../src/components/chart/x-axis.element';
import { RaftersArea } from '../../../src/components/chart/area.element';
import { RaftersAreaChart } from '../../../src/components/chart/area-chart.element';
import { computeAreas } from '../../../src/components/chart/area-chart.behavior';
import { resolveAreaFillClass } from '../../../src/components/chart/area-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

beforeAll(() => {
  if (!customElements.get('rafters-chart-container')) {
    customElements.define('rafters-chart-container', RaftersChartContainer);
  }
  if (!customElements.get('rafters-x-axis')) customElements.define('rafters-x-axis', RaftersXAxis);
  if (!customElements.get('rafters-area')) customElements.define('rafters-area', RaftersArea);
  if (!customElements.get('rafters-area-chart')) {
    customElements.define('rafters-area-chart', RaftersAreaChart);
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

const areaChartConfig = { data, series: ['desktop', 'mobile'] };

function markup(areaConfig: unknown = areaChartConfig, areaChildKeys: string[] = []): string {
  const areaChildren = areaChildKeys
    .map((key) => `<rafters-area data-part="series" data-key="${key}" hidden></rafters-area>`)
    .join('\n');
  return `
    <rafters-chart-container data-part="root" data-config='${JSON.stringify(chartConfig)}'>
      <div data-part="plot">
        <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
        <rafters-area-chart data-part="root" data-config='${JSON.stringify(areaConfig)}'>
          ${areaChildren}
          <svg data-part="plot"></svg>
          <table data-part="table"><tbody></tbody></table>
        </rafters-area-chart>
      </div>
    </rafters-chart-container>`;
}

/** happy-dom delivers MutationObserver callbacks on a macrotask, not a
 *  microtask -- same test-environment accommodation
 *  bar-chart.element.integration.test.ts documents. */
function flushMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mount(
  width: number,
  height: number,
  areaConfig: unknown = areaChartConfig,
  areaChildKeys: string[] = [],
): Promise<{
  containerRoot: HTMLElement;
  areaChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  document.body.innerHTML = markup(areaConfig, areaChildKeys);
  await Promise.resolve(); // deferred connectedCallback binds (both elements)
  triggerResize([{ contentRect: { width, height } }]); // ChartContainer's own bind sets its dataset
  await flushMutationObserver();

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const areaChartRoot = document.body.querySelector('rafters-area-chart') as HTMLElement;
  return { containerRoot, areaChartRoot, triggerResize };
}

describe('area-chart [wc]', () => {
  it('round-trips AreaChartConfig through the data-config JSON attribute', async () => {
    const { areaChartRoot } = await mount(300, 200);
    expect(areaChartRoot.getAttribute('data-config')).toBe(JSON.stringify(areaChartConfig));
  });

  it('creates one <path data-part="area"> and one <path data-part="line"> per computeAreas series, matching its geometry', async () => {
    const { areaChartRoot } = await mount(300, 200);
    const expected = computeAreas({ data, series: ['desktop', 'mobile'] }, chartConfig, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    const areaEls = areaChartRoot.querySelectorAll('[data-part="area"]');
    const lineEls = areaChartRoot.querySelectorAll('[data-part="line"]');
    expect(areaEls).toHaveLength(expected.series.length);
    expect(lineEls).toHaveLength(expected.series.length);
    for (const series of expected.series) {
      const areaEl = areaChartRoot.querySelector(
        `[data-part="area"][data-series-key="${series.key}"]`,
      );
      expect(areaEl, series.key).not.toBeNull();
      expect(areaEl?.getAttribute('d')).toBe(series.areaPath);
      expect(areaEl?.getAttribute('class')).toContain(resolveAreaFillClass(chartConfig, series));
    }
  });

  it('populates the data-table fallback tbody with one row per datum', async () => {
    const { areaChartRoot } = await mount(300, 200);
    const rows = areaChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[0]?.textContent).toContain('Jan');
  });

  it('root carries role=figure and a descriptive aria-label; svg is aria-hidden, never role=img', async () => {
    const { areaChartRoot } = await mount(300, 200);
    expect(areaChartRoot.getAttribute('role')).toBe('figure');
    expect(areaChartRoot.getAttribute('aria-label')).toContain('desktop');
    const svg = areaChartRoot.querySelector('[data-part="plot"]');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).not.toBe('img');
  });

  it('a resize of the ChartContainer ancestor recomputes area geometry', async () => {
    const { areaChartRoot, triggerResize } = await mount(300, 200);
    const before = areaChartRoot
      .querySelector('[data-part="area"][data-series-key="desktop"]')
      ?.getAttribute('d');

    triggerResize([{ contentRect: { width: 600, height: 400 } }]);
    await flushMutationObserver();

    const after = areaChartRoot
      .querySelector('[data-part="area"][data-series-key="desktop"]')
      ?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('arrow keys move the active-datum cursor, flagging exactly one series data-active', async () => {
    const { areaChartRoot } = await mount(300, 200);
    areaChartRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const activeAreas = areaChartRoot.querySelectorAll('[data-part="area"][data-active="true"]');
    expect(activeAreas).toHaveLength(1);
  });

  it('an empty data-config renders no areas/lines and no rows, without throwing', async () => {
    const { areaChartRoot } = await mount(300, 200, { data: [], series: ['desktop'] });
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(0);
    expect(areaChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(0);
    expect(areaChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });

  it('composed <rafters-area> children alone derive the series list -- no series in data-config', async () => {
    const { areaChartRoot } = await mount(300, 200, { data }, ['desktop', 'mobile']);
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(2);
    expect(
      areaChartRoot.querySelector('[data-part="area"][data-series-key="desktop"]'),
    ).not.toBeNull();
    expect(
      areaChartRoot.querySelector('[data-part="area"][data-series-key="mobile"]'),
    ).not.toBeNull();
  });

  it('composed <rafters-area> children win outright over data-config series when both are present', async () => {
    const { areaChartRoot } = await mount(300, 200, areaChartConfig, ['mobile']);
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(1);
    expect(
      areaChartRoot.querySelector('[data-part="area"][data-series-key="mobile"]'),
    ).not.toBeNull();
    expect(areaChartRoot.querySelector('[data-part="area"][data-series-key="desktop"]')).toBeNull();
  });
});
