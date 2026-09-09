import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { plotSize } from '../../a11y/plot-size';
import { nextFrame } from '../../a11y/next-frame';
import { ChartContainer } from '../../../src/components/chart/chart';
import { AreaChart } from '../../../src/components/chart/area-chart';
import { XAxis } from '../../../src/components/chart/x-axis';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

interface Scene {
  rows: typeof data;
  activate?: boolean;
}

function Chart({ rows }: { rows: typeof data }) {
  return (
    <main>
      <style>{plotSize()}</style>
      <ChartContainer config={config}>
        <AreaChart data={rows} series={['desktop', 'mobile']}>
          <XAxis dataKey="month" />
        </AreaChart>
      </ChartContainer>
    </main>
  );
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { rows: data }],
  ['empty data', { rows: [] }],
  ['active datum', { rows: data, activate: true }],
];

for (const [name, scene] of scenes) {
  test(`area-chart ${name}`, async ({ task }) => {
    const { container } = await render(<Chart rows={scene.rows} />);
    // ResizeObserver delivers after the first frame's layout; the geometry
    // (and the cursor reset that follows a geometry change) settles by the second.
    await nextFrame();
    await nextFrame();
    if (scene.activate) {
      const figure = container.querySelector('figure[data-part="root"]') as HTMLElement;
      figure.focus();
      figure.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await nextFrame();
      expect(container.querySelectorAll('[data-part="area"][data-active="true"]')).toHaveLength(1);
    }
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
