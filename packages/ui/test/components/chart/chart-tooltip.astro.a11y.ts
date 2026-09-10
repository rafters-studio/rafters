import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ChartTooltip from '../../../src/components/chart/chart-tooltip.astro';
import { bindChartTooltip } from '../../../src/components/chart/chart-tooltip.behavior';
import { bandScale } from '../../../src/primitives/graph';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const domain = ['Jan', 'Feb', 'Mar'];
const range: [number, number] = [0, 300];
const data = [
  { desktop: 100, mobile: 40 },
  { desktop: 205, mobile: 90 },
  { desktop: 150, mobile: 60 },
];

interface Scene {
  open: boolean;
}

async function mount(): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ChartTooltip, {
    props: { id: 't', config, domain, range, data },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // Inside the plot region a chart shell owns, the way chart-tooltip.astro
  // expects to be composed.
  document.body.innerHTML = `<main><div data-part="plot">${html}</div></main>`;
  return document;
}

/** Binds the way the page <script> does, then moves the pointer over the
 *  plot. Without layout every rect is zero, so the pointer normalizes to the
 *  first band (Jan). bindChartTooltip portals the panel into the ambient
 *  document.body (getPortalContainer, the same primitive Float composes),
 *  which under the astro project's happy-dom globals (registered by
 *  vitest.setup.astro.ts) is not the parsed window, so the open panel is
 *  audited where it lands. */
function openOnJan(parsed: Document): HTMLElement {
  const plot = parsed.querySelector('div[data-part="plot"]') as HTMLElement;
  const root = parsed.querySelector('rafters-chart-tooltip') as HTMLElement;
  bindChartTooltip(root, { scale: bandScale(domain, range), data, config });
  plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1, bubbles: true }));
  const content = globalThis.document.querySelector('[data-part="content"][data-state="open"]');
  expect(content).not.toBeNull();
  expect(content?.textContent).toContain('Jan');
  return content as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['SSR markup before any script runs', { open: false }],
  ['open on a hit-tested datum after bind', { open: true }],
];

for (const [name, scene] of scenes) {
  test(`chart-tooltip.astro ${name}`, async ({ task }) => {
    const document = await mount();
    const host = scene.open ? openOnJan(document) : document.body;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
