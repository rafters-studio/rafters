import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { decodeConfig } from '../../a11y/decode-config';
import Chart from '../../../src/components/chart/chart.astro';
import BarChartAstro from '../../../src/components/chart/bar-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { bindBarChart } from '../../../src/components/chart/bar-chart.behavior';
import {
  resolveBarEnterClass,
  resolveBarFillClass,
} from '../../../src/components/chart/bar-chart.classes';
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
  barConfig: { data: typeof data; series: string[] };
  bind: boolean;
}

async function mount({ barConfig, bind }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
  const barChartHtml = await container.renderToString(BarChartAstro, {
    props: { id: 'bars', ...barConfig },
    slots: { default: xAxisHtml },
  });
  const html = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: barChartHtml },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  if (bind) {
    const containerRoot = document.querySelector('rafters-chart-container') as HTMLElement;
    const barChartRoot = document.querySelector('rafters-bar-chart') as HTMLElement;
    decodeConfig(containerRoot);
    decodeConfig(barChartRoot);
    // The page <script>s do this per instance; the Container never runs them.
    bindChart(containerRoot);
    bindBarChart(barChartRoot, {
      barByLayout: resolveBarEnterClass,
      resolveFillClass: resolveBarFillClass,
    });
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'SSR markup before any script runs',
    { barConfig: { data, series: ['desktop', 'mobile'] }, bind: false },
  ],
  ['default', { barConfig: { data, series: ['desktop', 'mobile'] }, bind: true }],
  ['empty data', { barConfig: { data: [], series: ['desktop'] }, bind: true }],
];

for (const [name, scene] of scenes) {
  test(`bar-chart.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
