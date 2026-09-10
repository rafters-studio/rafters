import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { nextFrame } from '../../a11y/next-frame';
import { ChartContainer } from '../../../src/components/chart/chart';
import { CartesianGrid } from '../../../src/components/chart/cartesian-grid';
import { XAxis } from '../../../src/components/chart/x-axis';
import { YAxis } from '../../../src/components/chart/y-axis';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile' },
} satisfies ChartConfig;

interface Scene {
  axes: boolean;
}

function Scene({ axes }: Scene) {
  return (
    <main>
      <div style={{ width: 300, height: 200 }}>
        <ChartContainer config={config}>
          {axes ? (
            <>
              <CartesianGrid />
              <XAxis dataKey="month" />
              <YAxis />
            </>
          ) : null}
        </ChartContainer>
      </div>
    </main>
  );
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['with grid and both axes composed', { axes: true }],
  ['no axis or grid children (absence by omission)', { axes: false }],
];

for (const [name, scene] of scenes) {
  test(`chart ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...scene} />);
    await nextFrame(); // the plot's ResizeObserver reports its box after layout
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
