/**
 * Astro performance of AreaChart, driven end to end. AstroContainer renders
 * the SSR markup but does NOT run the <script>, so this suite calls
 * `bindChart`/`bindAreaChart` directly -- that IS the script's job -- then
 * drives the same score the React and WC suites drive.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string) --
 * renaming it away from "conformance" would silently drop it from both test
 * runs (same note bar-chart.astro.conformance.test.ts / chart.astro.conformance.test.ts
 * carry).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Chart from '../../../src/components/chart/chart.astro';
import AreaAstro from '../../../src/components/chart/area.astro';
import AreaChartAstro from '../../../src/components/chart/area-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { bindAreaChart, computeAreas } from '../../../src/components/chart/area-chart.behavior';
import {
  resolveAreaEnterClass,
  resolveAreaFillClass,
  resolveAreaLineClass,
  resolveAreaStrokeClass,
} from '../../../src/components/chart/area-chart.classes';
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
  areaConfig: Record<string, unknown> = { data, series: ['desktop', 'mobile'] },
  areaChildKeys: string[] = [],
): Promise<{
  containerRoot: HTMLElement;
  areaChartRoot: HTMLElement;
  triggerResize: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
}> {
  const { triggerResize } = stubResizeObserver();
  const container = await AstroContainer.create();

  const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
  const areaHtmls = await Promise.all(
    areaChildKeys.map((dataKey) => container.renderToString(AreaAstro, { props: { dataKey } })),
  );
  const areaChartHtml = await container.renderToString(AreaChartAstro, {
    props: { id: 'areas', ...areaConfig },
    slots: { default: [xAxisHtml, ...areaHtmls].join('\n') },
  });
  const chartHtml = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: areaChartHtml },
  });

  document.body.innerHTML = `<main>${chartHtml}</main>`;

  const containerRoot = document.body.querySelector('rafters-chart-container') as HTMLElement;
  const areaChartRoot = document.body.querySelector('rafters-area-chart') as HTMLElement;
  // happy-dom's innerHTML parser leaves numeric character entities intact in
  // attribute values (same quirk chart.astro.conformance.test.ts decodes);
  // a real browser decodes &#34; to " when parsing HTML.
  for (const el of [containerRoot, areaChartRoot]) {
    const raw = el.getAttribute('data-config');
    if (raw) el.setAttribute('data-config', raw.replaceAll('&#34;', '"'));
  }

  bindChart(containerRoot); // the chart-container <script> does this per instance
  triggerResize([{ contentRect: { width: 300, height: 200 } }]);
  // Same call area-chart.astro's own <script> makes.
  bindAreaChart(areaChartRoot, {
    areaClassName: resolveAreaEnterClass(),
    lineClassName: resolveAreaLineClass(),
    resolveFillClass: resolveAreaFillClass,
    resolveStrokeClass: resolveAreaStrokeClass,
  }); // the area-chart <script> does this per instance

  return { containerRoot, areaChartRoot, triggerResize };
}

describe('area-chart [astro]', () => {
  it('SSR: root/plot/table render, config serialized as data-config', async () => {
    const { areaChartRoot } = await mount();
    expect(areaChartRoot.getAttribute('data-config')).toBe(
      JSON.stringify({ data, series: ['desktop', 'mobile'] }),
    );
    expect(areaChartRoot.querySelector('[data-part="plot"]')).not.toBeNull();
    expect(areaChartRoot.querySelector('[data-part="table"]')).not.toBeNull();
  });

  it('SSR: role=figure and a descriptive aria-label are present before any script runs', async () => {
    const container = await AstroContainer.create();
    const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
    const html = await container.renderToString(AreaChartAstro, {
      props: { id: 'areas', data, series: ['desktop', 'mobile'] },
      slots: { default: xAxisHtml },
    });
    document.body.innerHTML = html;
    const root = document.body.querySelector('rafters-area-chart') as HTMLElement;
    expect(root.getAttribute('role')).toBe('figure');
    expect(root.getAttribute('aria-label')).toContain('desktop');
  });

  it('bind: creates area/line paths matching computeAreas once the container is measured', async () => {
    const { areaChartRoot } = await mount();
    const expected = computeAreas({ data, series: ['desktop', 'mobile'] }, chartConfig, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    const areaEls = areaChartRoot.querySelectorAll('[data-part="area"]');
    expect(areaEls).toHaveLength(expected.series.length);
    const desktopEl = areaChartRoot.querySelector('[data-series-key="desktop"][data-part="area"]');
    const expectedDesktop = expected.series.find((s) => s.key === 'desktop');
    expect(desktopEl?.getAttribute('d')).toBe(expectedDesktop?.areaPath);
  });

  it('bind: populates the data-table fallback', async () => {
    const { areaChartRoot } = await mount();
    const rows = areaChartRoot.querySelectorAll('[data-part="table"] tbody tr');
    expect(rows).toHaveLength(4);
  });

  it('bind: a later resize of the ChartContainer ancestor recomputes area geometry', async () => {
    const { areaChartRoot, triggerResize } = await mount();
    const before = areaChartRoot
      .querySelector('[data-series-key="desktop"][data-part="area"]')
      ?.getAttribute('d');

    triggerResize([{ contentRect: { width: 600, height: 400 } }]);
    await flushMutationObserver();

    const after = areaChartRoot
      .querySelector('[data-series-key="desktop"][data-part="area"]')
      ?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('an empty data-config renders no areas/lines and no rows, without throwing', async () => {
    const { areaChartRoot } = await mount({ data: [], series: ['desktop'] });
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(0);
    expect(areaChartRoot.querySelectorAll('[data-part="table"] tbody tr')).toHaveLength(0);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const { containerRoot } = await mount();
    await assertAxeClean(document.body.querySelector('main') ?? containerRoot);
  });

  it('composed <rafters-area> children alone derive the series list -- no series in data-config', async () => {
    const { areaChartRoot } = await mount({ data }, ['desktop', 'mobile']);
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(2);
    expect(
      areaChartRoot.querySelector('[data-series-key="desktop"][data-part="area"]'),
    ).not.toBeNull();
    expect(
      areaChartRoot.querySelector('[data-series-key="mobile"][data-part="area"]'),
    ).not.toBeNull();
  });

  it('composed <rafters-area> children win outright over data-config series when both are present', async () => {
    const { areaChartRoot } = await mount({ data, series: ['desktop', 'mobile'] }, ['mobile']);
    expect(areaChartRoot.querySelectorAll('[data-part="area"]')).toHaveLength(1);
    expect(
      areaChartRoot.querySelector('[data-series-key="mobile"][data-part="area"]'),
    ).not.toBeNull();
    expect(areaChartRoot.querySelector('[data-series-key="desktop"][data-part="area"]')).toBeNull();
  });
});
