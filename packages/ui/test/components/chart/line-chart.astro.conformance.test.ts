/**
 * Astro performance of LineChart, driven end to end. AstroContainer renders
 * the SSR markup but does NOT run the <script>, so this suite calls
 * `bindChart`/`bindLineChart` directly -- that IS the script's job -- then
 * drives the same score the React and WC suites drive.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string), same
 * note bar-chart.astro.conformance.test.ts carries.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Chart from '../../../src/components/chart/chart.astro';
import LineAstro from '../../../src/components/chart/line.astro';
import LineChartAstro from '../../../src/components/chart/line-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import {
  bindLineChart,
  computeDots,
  computeLinePoints,
} from '../../../src/components/chart/line-chart.behavior';
import {
  resolveDotFillClass,
  resolveLineEnterClass,
  resolveLineStrokeClass,
} from '../../../src/components/chart/line-chart.classes';
import { assertAxeClean } from '../../harness/conformance';
import { stubResizeObserver } from '../../harness/resize-observer';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const chartConfig = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
};

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

function flushMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mount(
  lineConfig: Record<string, unknown> = { data, series: ['desktop', 'mobile'] },
  lineChildKeys: string[] = [],
  withXAxis = true,
): Promise<{
  containerRoot: HTMLElement;
  lineChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  const container = await AstroContainer.create();

  const xAxisHtml = withXAxis
    ? await container.renderToString(XAxis, { props: { dataKey: 'month' } })
    : '';
  const lineHtmls = await Promise.all(
    lineChildKeys.map((dataKey) => container.renderToString(LineAstro, { props: { dataKey } })),
  );
  const lineChartHtml = await container.renderToString(LineChartAstro, {
    props: { id: 'lines', ...lineConfig },
    slots: { default: [xAxisHtml, ...lineHtmls].join('\n') },
  });
  const chartHtml = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: lineChartHtml },
  });

  document.body.innerHTML = `<main>${chartHtml}</main>`;

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const lineChartRoot = document.body.querySelector('rafters-line-chart') as HTMLElement;
  // happy-dom's innerHTML parser leaves numeric character entities intact in
  // attribute values, same quirk bar-chart.astro.conformance.test.ts decodes.
  for (const el of [containerRoot, lineChartRoot]) {
    const raw = el?.getAttribute('data-config');
    if (raw) el.setAttribute('data-config', raw.replaceAll('&#34;', '"'));
  }

  bindChart(containerRoot); // the chart-container <script> does this per instance
  triggerResize([{ contentRect: { width: 300, height: 200 } }]);
  bindLineChart(lineChartRoot, {
    lineEnterClass: resolveLineEnterClass(),
    resolveStrokeClass: resolveLineStrokeClass,
    resolveDotFillClass: resolveDotFillClass,
  }); // the line-chart <script> does this per instance

  return { containerRoot, lineChartRoot, triggerResize };
}

describe('line-chart [astro]', () => {
  it('SSR: root/plot/table render, config serialized as data-config', async () => {
    const { lineChartRoot } = await mount();
    expect(lineChartRoot.getAttribute('data-config')).toBe(
      JSON.stringify({ data, series: ['desktop', 'mobile'] }),
    );
    expect(lineChartRoot.querySelector('[data-part="plot"]')).not.toBeNull();
    expect(lineChartRoot.querySelector('[data-part="table"]')).not.toBeNull();
  });

  it('SSR: role=figure and a descriptive aria-label are present before any script runs', async () => {
    const container = await AstroContainer.create();
    const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
    const html = await container.renderToString(LineChartAstro, {
      props: { id: 'lines', data, series: ['desktop', 'mobile'] },
      slots: { default: xAxisHtml },
    });
    document.body.innerHTML = html;
    const root = document.body.querySelector('rafters-line-chart') as HTMLElement;
    expect(root.getAttribute('role')).toBe('figure');
    expect(root.getAttribute('aria-label')).toContain('desktop');
  });

  it('bind: creates line paths and point dots matching computeLinePoints once the container is measured', async () => {
    const { lineChartRoot } = await mount();
    const expected = computeLinePoints(
      { data, series: ['desktop', 'mobile'] },
      { categoryKey: 'month', width: 300, height: 200 },
    );
    const paths = lineChartRoot.querySelectorAll('[data-part="line"]');
    expect(paths).toHaveLength(2);
    const dots = lineChartRoot.querySelectorAll('[data-part="point"]');
    expect(dots).toHaveLength(computeDots(expected).length);
    const desktopDot = lineChartRoot.querySelector('[data-point-key="Jan:desktop"]');
    const expectedDot = computeDots(expected).find((d) => d.key === 'Jan:desktop');
    expect(Number(desktopDot?.getAttribute('cy'))).toBeCloseTo(expectedDot?.y ?? -1);
  });

  it('bind: populates the data-table fallback', async () => {
    const { lineChartRoot } = await mount();
    const rows = lineChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
  });

  it('bind: a later resize of the ChartContainer ancestor recomputes line geometry', async () => {
    const { lineChartRoot, triggerResize } = await mount();
    const before = lineChartRoot.querySelector('[data-series-key="desktop"]')?.getAttribute('d');

    triggerResize([{ contentRect: { width: 600, height: 400 } }]);
    await flushMutationObserver();

    const after = lineChartRoot.querySelector('[data-series-key="desktop"]')?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('an empty data-config renders no lines, no points, and no rows, without throwing', async () => {
    const { lineChartRoot } = await mount({ data: [], series: ['desktop'] });
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(0);
    expect(lineChartRoot.querySelectorAll('[data-part="point"]')).toHaveLength(0);
    expect(lineChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const { containerRoot } = await mount();
    await assertAxeClean(document.body.querySelector('main') ?? containerRoot);
  });

  it('composed <rafters-line> children alone derive the series list -- no series in data-config', async () => {
    const { lineChartRoot } = await mount({ data }, ['desktop', 'mobile']);
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(2);
    expect(lineChartRoot.querySelector('[data-series-key="desktop"]')).not.toBeNull();
    expect(lineChartRoot.querySelector('[data-series-key="mobile"]')).not.toBeNull();
  });

  it('composed <rafters-line> children win outright over data-config series when both are present', async () => {
    const { lineChartRoot } = await mount({ data, series: ['desktop', 'mobile'] }, ['mobile']);
    expect(lineChartRoot.querySelectorAll('[data-part="line"]')).toHaveLength(1);
    expect(lineChartRoot.querySelector('[data-series-key="mobile"]')).not.toBeNull();
    expect(lineChartRoot.querySelector('[data-series-key="desktop"]')).toBeNull();
  });

  it('axis-less by omission: no XAxis composed -> Sparkline aria-label after bind', async () => {
    const { lineChartRoot } = await mount({ data, series: ['desktop'] }, [], false);
    expect(lineChartRoot.getAttribute('aria-label')).toMatch(/^Sparkline of/);
  });
});
