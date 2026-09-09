import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
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

/** No stylesheet loads in the a11y browser, so the plot box is pinned here:
 *  the real ResizeObserver then reports a stable 300x200 (the size the unit
 *  suite stubs) instead of a content-driven height the chart's own svg would
 *  feed back into on every frame. */
const PLOT_SIZE = 'div[data-part="plot"]{width:300px;height:200px}';

function Chart({ rows }: { rows: typeof data }) {
  return (
    <main>
      <style>{PLOT_SIZE}</style>
      <ChartContainer config={config}>
        <AreaChart data={rows} series={['desktop', 'mobile']}>
          <XAxis dataKey="month" />
        </AreaChart>
      </ChartContainer>
    </main>
  );
}

function nextFrame(): Promise<void> {
  return new Promise<void>((done) => requestAnimationFrame(() => done()));
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
