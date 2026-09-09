import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import { LineChart } from '../../../src/components/chart/line-chart';
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
  series?: string[];
  dots?: boolean;
  /** false composes no XAxis: the axis-less-by-omission sparkline shape (#2230). */
  axis?: boolean;
  activate?: boolean;
  sparkline?: boolean;
}

/** No stylesheet loads in the a11y browser, so the plot box is pinned here:
 *  the real ResizeObserver then reports a stable 300x200 (the size the unit
 *  suite stubs) instead of a content-driven height the chart's own svg would
 *  feed back into on every frame. */
const PLOT_SIZE = 'div[data-part="plot"]{width:300px;height:200px}';

function Chart({ rows, series = ['desktop', 'mobile'], dots = true, axis = true }: Scene) {
  return (
    <main>
      <style>{PLOT_SIZE}</style>
      <ChartContainer config={config}>
        <LineChart data={rows} series={series} dots={dots}>
          {axis ? <XAxis dataKey="month" /> : null}
        </LineChart>
      </ChartContainer>
    </main>
  );
}

function nextFrame(): Promise<void> {
  return new Promise<void>((done) => requestAnimationFrame(() => done()));
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { rows: data }],
  ['dots suppressed', { rows: data, series: ['desktop'], dots: false }],
  [
    'sparkline (no axis or grid composed)',
    { rows: data, series: ['desktop'], axis: false, sparkline: true },
  ],
  ['empty data', { rows: [] }],
  ['active datum', { rows: data, activate: true }],
];

for (const [name, scene] of scenes) {
  test(`line-chart ${name}`, async ({ task }) => {
    const { container } = await render(<Chart {...scene} />);
    // ResizeObserver delivers after the first frame's layout; the points (and
    // the cursor reset that follows a point-set change) settle by the second.
    await nextFrame();
    await nextFrame();
    const figure = container.querySelector('figure[data-part="root"]') as HTMLElement;
    if (scene.sparkline) {
      expect(figure.getAttribute('aria-label')).toMatch(/^Sparkline of/);
    }
    if (scene.dots === false) {
      expect(container.querySelectorAll('[data-part="point"]')).toHaveLength(0);
    }
    if (scene.activate) {
      figure.focus();
      figure.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await nextFrame();
      expect(container.querySelectorAll('[data-part="point"][data-active="true"]')).toHaveLength(1);
    }
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
