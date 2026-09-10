import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { plotSize } from '../../a11y/plot-size';
import { nextFrame } from '../../a11y/next-frame';
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
}

function Chart({ rows, series = ['desktop', 'mobile'], dots = true, axis = true }: Scene) {
  return (
    <main>
      <style>{plotSize()}</style>
      <ChartContainer config={config}>
        <LineChart data={rows} series={series} dots={dots}>
          {axis ? <XAxis dataKey="month" /> : null}
        </LineChart>
      </ChartContainer>
    </main>
  );
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { rows: data }],
  ['dots suppressed', { rows: data, series: ['desktop'], dots: false }],
  ['sparkline (no axis or grid composed)', { rows: data, series: ['desktop'], axis: false }],
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
    if (scene.axis === false) {
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
