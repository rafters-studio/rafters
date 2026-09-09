import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import { ChartLegend, ChartLegendContent } from '../../../src/components/chart/chart-legend';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

interface Scene {
  cfg: ChartConfig;
  nameKey?: string;
  focusFirst?: boolean;
}

function Legend({ cfg, nameKey }: Scene) {
  return (
    <main>
      <ChartContainer config={cfg}>
        <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
      </ChartContainer>
    </main>
  );
}

function nextFrame(): Promise<void> {
  return new Promise<void>((done) => requestAnimationFrame(() => done()));
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { cfg: config }],
  ['empty config', { cfg: {} }],
  ['nameKey overriding every label', { cfg: config, nameKey: 'mobile' }],
  ['first entry focused', { cfg: config, focusFirst: true }],
];

for (const [name, scene] of scenes) {
  test(`chart-legend ${name}`, async ({ task }) => {
    const { container } = await render(<Legend {...scene} />);
    if (scene.focusFirst) {
      const entry = container.querySelector<HTMLElement>('[data-part="entry"]') as HTMLElement;
      entry.focus();
      await nextFrame();
      expect(document.activeElement).toBe(entry);
    }
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
