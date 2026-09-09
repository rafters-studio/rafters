import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Chart from '../../../src/components/chart/chart.astro';
import LineChartAstro from '../../../src/components/chart/line-chart.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { bindLineChart } from '../../../src/components/chart/line-chart.behavior';
import {
  resolveDotFillClass,
  resolveLineEnterClass,
  resolveLineStrokeClass,
} from '../../../src/components/chart/line-chart.classes';
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
  lineConfig: { data: typeof data; series: string[]; dots?: boolean };
  /** false slots no XAxis: the axis-less-by-omission sparkline shape (#2230). */
  axis?: boolean;
  bind: boolean;
}

/** happy-dom's innerHTML parser leaves numeric character entities intact in
 *  attribute values; a real browser decodes `&#34;` to `"` when parsing, so
 *  undo it before a bind reads data-config as JSON. */
function decodeConfig(el: HTMLElement): void {
  const raw = el.getAttribute('data-config');
  if (raw) el.setAttribute('data-config', raw.replaceAll('&#34;', '"'));
}

async function mount({ lineConfig, axis = true, bind }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const xAxisHtml = axis
    ? await container.renderToString(XAxis, { props: { dataKey: 'month' } })
    : '';
  const lineChartHtml = await container.renderToString(LineChartAstro, {
    props: { id: 'lines', ...lineConfig },
    slots: { default: xAxisHtml },
  });
  const html = await container.renderToString(Chart, {
    props: { id: 'c', config: chartConfig },
    slots: { default: lineChartHtml },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  if (bind) {
    const containerRoot = document.querySelector('rafters-chart-container') as HTMLElement;
    const lineChartRoot = document.querySelector('rafters-line-chart') as HTMLElement;
    decodeConfig(containerRoot);
    decodeConfig(lineChartRoot);
    // The page <script>s do this per instance; the Container never runs them.
    bindChart(containerRoot);
    bindLineChart(lineChartRoot, {
      lineEnterClass: resolveLineEnterClass(),
      resolveStrokeClass: resolveLineStrokeClass,
      resolveDotFillClass: resolveDotFillClass,
    });
    if (!axis) {
      expect(lineChartRoot.getAttribute('aria-label')).toMatch(/^Sparkline of/);
    }
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'SSR markup before any script runs',
    { lineConfig: { data, series: ['desktop', 'mobile'] }, bind: false },
  ],
  ['default', { lineConfig: { data, series: ['desktop', 'mobile'] }, bind: true }],
  ['dots suppressed', { lineConfig: { data, series: ['desktop'], dots: false }, bind: true }],
  [
    'sparkline (no axis or grid slotted)',
    { lineConfig: { data, series: ['desktop'] }, axis: false, bind: true },
  ],
  ['empty data', { lineConfig: { data: [], series: ['desktop'] }, bind: true }],
];

for (const [name, scene] of scenes) {
  test(`line-chart.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
