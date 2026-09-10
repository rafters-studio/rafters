import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { nextFrame } from '../../a11y/next-frame';
import '../../../src/components/chart/chart.element';
import '../../../src/components/chart/cartesian-grid.element';
import '../../../src/components/chart/x-axis.element';
import '../../../src/components/chart/y-axis.element';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile' },
} satisfies ChartConfig;

interface Scene {
  axes: boolean;
}

const AXES = `
  <rafters-cartesian-grid data-part="grid" hidden></rafters-cartesian-grid>
  <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
  <rafters-y-axis data-part="y-axis" hidden></rafters-y-axis>`;

async function mount({ axes }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-chart-container data-part="root" data-config='${JSON.stringify(config)}'>
        <div data-part="plot" style="width:300px;height:200px">${axes ? AXES : ''}</div>
      </rafters-chart-container>
    </main>`;
  await Promise.resolve(); // the elements bind one microtask after connecting
  await nextFrame(); // the plot's ResizeObserver reports its box after layout
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['with grid and both axes composed', { axes: true }],
  ['no axis or grid children (absence by omission)', { axes: false }],
];

for (const [name, scene] of scenes) {
  test(`rafters-chart-container ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
