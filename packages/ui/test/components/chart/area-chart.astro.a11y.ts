import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { decodeConfig } from '../../a11y/decode-config';
import Chart from '../../../src/components/chart/chart.astro';
import AreaChartAstro from '../../../src/components/chart/area-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { bindAreaChart } from '../../../src/components/chart/area-chart.behavior';
import {
  resolveAreaEnterClass,
  resolveAreaFillClass,
  resolveAreaLineClass,
  resolveAreaStrokeClass,
} from '../../../src/components/chart/area-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const chartConfig = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

interface Scene {
  areaConfig: { data: typeof data; series: string[] };
  bind: boolean;
}

async function mount({ areaConfig, bind }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
  const areaChartHtml = await container.renderToString(AreaChartAstro, {
    props: { id: 'areas', ...areaConfig },
    slots: { default: xAxisHtml },
  });
  const html = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: areaChartHtml },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  if (bind) {
    const containerRoot = document.querySelector('rafters-chart-container') as HTMLElement;
    const areaChartRoot = document.querySelector('rafters-area-chart') as HTMLElement;
    decodeConfig(containerRoot);
    decodeConfig(areaChartRoot);
    // The page <script>s do this per instance; the Container never runs them.
    bindChart(containerRoot);
    bindAreaChart(areaChartRoot, {
      areaClassName: resolveAreaEnterClass(),
      lineClassName: resolveAreaLineClass(),
      resolveFillClass: resolveAreaFillClass,
      resolveStrokeClass: resolveAreaStrokeClass,
    });
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'SSR markup before any script runs',
    { areaConfig: { data, series: ['desktop', 'mobile'] }, bind: false },
  ],
  ['default', { areaConfig: { data, series: ['desktop', 'mobile'] }, bind: true }],
  ['empty data', { areaConfig: { data: [], series: ['desktop'] }, bind: true }],
];

for (const [name, scene] of scenes) {
  test(`area-chart.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
