import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { nextFrame } from '../../a11y/next-frame';
import '../../../src/components/chart/chart.element';
import '../../../src/components/chart/x-axis.element';
import '../../../src/components/chart/area-chart.element';
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
  activate?: boolean;
}

/** The light-DOM shape area-chart.element.ts documents, with the table given
 *  the caption and header row area-chart.astro server-renders for it. No
 *  stylesheet loads here, so the container's plot box is pinned inline and
 *  the real ResizeObserver reports a stable size for the bind to draw
 *  against. */
function markup(areaConfig: Scene['areaConfig']): string {
  return `
    <main>
      <rafters-chart-container data-part="root" data-config='${JSON.stringify(chartConfig)}'>
        <div data-part="plot" style="width:300px;height:200px">
          <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
          <rafters-area-chart data-part="root" data-config='${JSON.stringify(areaConfig)}'>
            <svg data-part="plot"></svg>
            <table data-part="table">
              <caption>Area chart of desktop and mobile by month</caption>
              <thead>
                <tr><th scope="col">Category</th><th scope="col">Series</th><th scope="col">Value</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </rafters-area-chart>
        </div>
      </rafters-chart-container>
    </main>`;
}

async function mount({ areaConfig, activate = false }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = markup(areaConfig);
  await Promise.resolve(); // both elements bind one microtask after connecting
  // ResizeObserver publishes the container size after the first frame's
  // layout; the area bind's MutationObserver on that dataset draws by the next.
  await nextFrame();
  await nextFrame();
  if (activate) {
    const root = document.body.querySelector('rafters-area-chart') as HTMLElement;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(root.querySelectorAll('[data-part="area"][data-active="true"]')).toHaveLength(1);
  }
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { areaConfig: { data, series: ['desktop', 'mobile'] } }],
  ['empty data', { areaConfig: { data: [], series: ['desktop'] } }],
  ['active datum', { areaConfig: { data, series: ['desktop', 'mobile'] }, activate: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-area-chart ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
