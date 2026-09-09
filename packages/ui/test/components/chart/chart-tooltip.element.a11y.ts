import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { nextFrame } from '../../a11y/next-frame';
import '../../../src/components/chart/chart-tooltip.element';
import type { RaftersChartTooltip } from '../../../src/components/chart/chart-tooltip.element';
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

/** The light-DOM shape chart-tooltip.element.ts documents, inside the plot
 *  region a chart shell owns. No stylesheet loads here, so the plot is
 *  pinned to a real box and a pointer position normalizes to a datum. */
async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <div data-part="plot" style="width:300px;height:100px">
        <rafters-chart-tooltip data-part="root">
          <div data-part="content" data-state="closed"></div>
        </rafters-chart-tooltip>
      </div>
    </main>`;
  const el = document.body.querySelector('rafters-chart-tooltip') as RaftersChartTooltip;
  // Each setter re-binds once connected, the way the element's doc example
  // hands it its scale and rows.
  el.config = config;
  el.domain = domain;
  el.range = range;
  el.data = data;
  await Promise.resolve(); // the connect-time bind settles one microtask later
  return document.body.querySelector('main') as HTMLElement;
}

/** Moves the pointer over the plot's second band and returns the open panel.
 *  bindChartTooltip portals the panel to document.body (getPortalContainer,
 *  the same primitive Float composes), outside <main>, so the panel itself
 *  is the audit host for the open state. */
async function openOnFeb(main: HTMLElement): Promise<HTMLElement> {
  const plot = main.querySelector('div[data-part="plot"]') as HTMLElement;
  const rect = plot.getBoundingClientRect();
  plot.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: rect.left + rect.width * 0.51,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
    }),
  );
  await nextFrame();
  const content = document.querySelector('[data-part="content"][data-state="open"]');
  expect(content).not.toBeNull();
  expect(content?.textContent).toContain('Feb');
  return content as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['mounted with no datum resolved', { open: false }],
  ['open on a hit-tested datum', { open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-chart-tooltip ${name}`, async ({ task }) => {
    const main = await mount();
    const host = scene.open ? await openOnFeb(main) : main;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
