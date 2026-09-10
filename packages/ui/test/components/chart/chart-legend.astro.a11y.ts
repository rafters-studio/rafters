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

interface Scene {
  props: Record<string, unknown>;
  focusFirst?: boolean;
}

async function mount({ props, focusFirst = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ChartLegend, {
    props: { id: 'l', config, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindChartLegend(document.querySelector('rafters-chart-legend') as HTMLElement);
  if (focusFirst) {
    const entry = document.querySelector<HTMLElement>('[data-part="entry"]') as HTMLElement;
    entry.focus();
    expect(document.activeElement).toBe(entry);
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { props: {} }],
  ['empty config', { props: { config: {} } }],
  ['nameKey overriding every label', { props: { nameKey: 'mobile' } }],
  [
    'token-less series on the index fallback',
    { props: { config: { ...config, mobile: { label: 'Mobile' } } } },
  ],
  ['first entry focused', { props: {}, focusFirst: true }],
];

for (const [name, scene] of scenes) {
  test(`chart-legend.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
