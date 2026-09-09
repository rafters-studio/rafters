import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ChartLegend from '../../../src/components/chart/chart-legend.astro';
import { bindChartLegend } from '../../../src/components/chart/chart-legend.behavior';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ChartLegend, {
    props: { id: 'l', config, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindChartLegend(document.querySelector('rafters-chart-legend') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['default', {}],
  ['empty config', { config: {} }],
  ['nameKey overriding every label', { nameKey: 'mobile' }],
  [
    'token-less series on the index fallback',
    { config: { ...config, mobile: { label: 'Mobile' } } },
  ],
];

for (const [name, props] of scenes) {
  test(`chart-legend.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
