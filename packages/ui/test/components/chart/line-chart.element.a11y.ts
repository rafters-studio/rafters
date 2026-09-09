import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { nextFrame } from '../../a11y/next-frame';
import '../../../src/components/chart/chart.element';
import '../../../src/components/chart/x-axis.element';
import '../../../src/components/chart/line-chart.element';
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
  /** false composes no x-axis element: the axis-less-by-omission sparkline shape (#2230). */
  axis?: boolean;
  activate?: boolean;
}

/** The light-DOM shape line-chart.element.ts documents, with the table given
 *  the caption and header row line-chart.astro server-renders for it. No
 *  stylesheet loads here, so the container's plot box is pinned inline and
 *  the real ResizeObserver reports a stable size for the bind to draw
 *  against. */
function markup(lineConfig: Scene['lineConfig'], axis: boolean): string {
  const xAxis = axis
    ? '<rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>'
    : '';
  return `
    <main>
      <rafters-chart-container data-part="root" data-config='${JSON.stringify(chartConfig)}'>
        <div data-part="plot" style="width:300px;height:200px">
          ${xAxis}
          <rafters-line-chart data-part="root" data-config='${JSON.stringify(lineConfig)}'>
            <svg data-part="plot"></svg>
            <table data-part="table">
              <caption>Line chart of desktop and mobile by month</caption>
              <thead>
                <tr><th scope="col">Category</th><th scope="col">Series</th><th scope="col">Value</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </rafters-line-chart>
        </div>
      </rafters-chart-container>
    </main>`;
}

async function mount({ lineConfig, axis = true, activate = false }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = markup(lineConfig, axis);
  await Promise.resolve(); // both elements bind one microtask after connecting
  // ResizeObserver publishes the container size after the first frame's
  // layout; the line bind's MutationObserver on that dataset draws by the next.
  await nextFrame();
  await nextFrame();
  const root = document.body.querySelector('rafters-line-chart') as HTMLElement;
  if (!axis) {
    expect(root.getAttribute('aria-label')).toMatch(/^Sparkline of/);
  }
  if (lineConfig.dots === false) {
    expect(root.querySelectorAll('[data-part="point"]')).toHaveLength(0);
  }
  if (activate) {
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(root.querySelectorAll('[data-part="point"][data-active="true"]')).toHaveLength(1);
  }
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { lineConfig: { data, series: ['desktop', 'mobile'] } }],
  ['dots suppressed', { lineConfig: { data, series: ['desktop'], dots: false } }],
  [
    'sparkline (no axis or grid composed)',
    { lineConfig: { data, series: ['desktop'] }, axis: false },
  ],
  ['empty data', { lineConfig: { data: [], series: ['desktop'] } }],
  ['active datum', { lineConfig: { data, series: ['desktop', 'mobile'] }, activate: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-line-chart ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
