import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { decodeConfig } from '../../a11y/decode-config';
import Chart from '../../../src/components/chart/chart.astro';
import CartesianGrid from '../../../src/components/chart/cartesian-grid.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import YAxis from '../../../src/components/chart/y-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

interface Scene {
  axes: boolean;
}

async function mount({ axes }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const children = axes
    ? [
        await container.renderToString(CartesianGrid, { props: {} }),
        await container.renderToString(XAxis, { props: { dataKey: 'month' } }),
        await container.renderToString(YAxis, { props: {} }),
      ].join('')
    : '';
  const html = await container.renderToString(Chart, {
    props: { id: 'c', config },
    slots: { default: children },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.querySelector('rafters-chart-container') as HTMLElement;
  decodeConfig(root);
  bindChart(root); // the page <script> does this per instance; the Container never runs it
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['with grid and both axes slotted', { axes: true }],
  ['no axis or grid children (absence by omission)', { axes: false }],
];

for (const [name, scene] of scenes) {
  test(`chart.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
