/**
 * Astro performance of BarChart, driven end to end. AstroContainer renders
 * the SSR markup but does NOT run the <script>, so this suite calls
 * `bindChart`/`bindBarChart` directly -- that IS the script's job -- then
 * drives the same score the React and WC suites drive.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string) --
 * renaming it away from "conformance" would silently drop it from both test
 * runs (same note chart.astro.conformance.test.ts carries).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Chart from '../../../src/components/chart/chart.astro';
import BarAstro from '../../../src/components/chart/bar.astro';
import BarChartAstro from '../../../src/components/chart/bar-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { bindBarChart, computeBars } from '../../../src/components/chart/bar-chart.behavior';
import {
  resolveBarEnterClass,
  resolveBarFillClass,
} from '../../../src/components/chart/bar-chart.classes';
import { assertAxeClean } from '../../harness/conformance';
import { stubResizeObserver } from '../../harness/resize-observer';
import { vi } from 'vitest';

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
  barConfig: Record<string, unknown> = { data, series: ['desktop', 'mobile'] },
  barChildKeys: string[] = [],
): Promise<{
  containerRoot: HTMLElement;
  barChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  const container = await AstroContainer.create();

  const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
  const barHtmls = await Promise.all(
    barChildKeys.map((dataKey) => container.renderToString(BarAstro, { props: { dataKey } })),
  );
  const barChartHtml = await container.renderToString(BarChartAstro, {
    props: { id: 'bars', ...barConfig },
    slots: { default: [xAxisHtml, ...barHtmls].join('\n') },
  });
  const chartHtml = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: barChartHtml },
  });

  document.body.innerHTML = `<main>${chartHtml}</main>`;

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const barChartRoot = document.body.querySelector('rafters-bar-chart') as HTMLElement;
  // happy-dom's innerHTML parser leaves numeric character entities intact in
  // attribute values (same quirk chart.astro.conformance.test.ts decodes);
  // a real browser decodes &#34; to " when parsing HTML.
  for (const el of [containerRoot, barChartRoot]) {
    const raw = el.getAttribute('data-config');
    if (raw) el.setAttribute('data-config', raw.replaceAll('&#34;', '"'));
  }

  bindChart(containerRoot); // the chart-container <script> does this per instance
  triggerResize([{ contentRect: { width: 300, height: 200 } }]);
  // Same call bar-chart.astro's own <script> makes -- resolveBarEnterClass is
  // the whole of barChartClasses's layout-dependent surface, and bindBarChart
  // resolves config.layout (and any composed <rafters-bar> children) itself.
  bindBarChart(barChartRoot, {
    barByLayout: resolveBarEnterClass,
    resolveFillClass: resolveBarFillClass,
  }); // the bar-chart <script> does this per instance

  return { containerRoot, barChartRoot, triggerResize };
}

describe('bar-chart [astro]', () => {
  it('SSR: root/plot/table render, config serialized as data-config', async () => {
    const { barChartRoot } = await mount();
    expect(barChartRoot.getAttribute('data-config')).toBe(
      JSON.stringify({ data, series: ['desktop', 'mobile'] }),
    );
    expect(barChartRoot.querySelector('[data-part="plot"]')).not.toBeNull();
    expect(barChartRoot.querySelector('[data-part="table"]')).not.toBeNull();
  });

  it('SSR: role=figure and a descriptive aria-label are present before any script runs', async () => {
    const container = await AstroContainer.create();
    const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
    const html = await container.renderToString(BarChartAstro, {
      props: { id: 'bars', data, series: ['desktop', 'mobile'] },
      slots: { default: xAxisHtml },
    });
    document.body.innerHTML = html;
    const root = document.body.querySelector('rafters-bar-chart') as HTMLElement;
    expect(root.getAttribute('role')).toBe('figure');
    expect(root.getAttribute('aria-label')).toContain('desktop');
  });

  it('bind: creates bar rects matching computeBars once the container is measured', async () => {
    const { barChartRoot } = await mount();
    const expected = computeBars({ data, series: ['desktop', 'mobile'] }, chartConfig, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    const rects = barChartRoot.querySelectorAll('[data-part="bar"]');
    expect(rects).toHaveLength(expected.length);
    const janDesktop = barChartRoot.querySelector('[data-bar-key="Jan:desktop"]');
    const expectedBar = expected.find((b) => b.key === 'Jan:desktop');
    expect(Number(janDesktop?.getAttribute('height'))).toBeCloseTo(expectedBar?.height ?? -1);
  });

  it('bind: populates the data-table fallback', async () => {
    const { barChartRoot } = await mount();
    const rows = barChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
  });

  it('bind: a later resize of the ChartContainer ancestor recomputes bar geometry', async () => {
    const { barChartRoot, triggerResize } = await mount();
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

  it('an empty data-config renders no bars and no rows, without throwing', async () => {
    const { barChartRoot } = await mount({ data: [], series: ['desktop'] });
    expect(barChartRoot.querySelectorAll('[data-part="bar"]')).toHaveLength(0);
    expect(barChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const { containerRoot } = await mount();
    await assertAxeClean(document.body.querySelector('main') ?? containerRoot);
  });

  it('composed <rafters-bar> children alone derive the series list -- no series in data-config', async () => {
    const { barChartRoot } = await mount({ data }, ['desktop', 'mobile']);
    expect(barChartRoot.querySelectorAll('[data-part="bar"]')).toHaveLength(4);
    expect(barChartRoot.querySelector('[data-bar-key="Jan:desktop"]')).not.toBeNull();
    expect(barChartRoot.querySelector('[data-bar-key="Jan:mobile"]')).not.toBeNull();
  });

  it('composed <rafters-bar> children win outright over data-config series when both are present', async () => {
    const { barChartRoot } = await mount({ data, series: ['desktop', 'mobile'] }, ['mobile']);
    expect(barChartRoot.querySelectorAll('[data-part="bar"]')).toHaveLength(2);
    expect(barChartRoot.querySelector('[data-bar-key="Jan:mobile"]')).not.toBeNull();
    expect(barChartRoot.querySelector('[data-bar-key="Jan:desktop"]')).toBeNull();
  });
});
