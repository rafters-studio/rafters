import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import { ChartTooltip, ChartTooltipContent } from '../../../src/components/chart/chart-tooltip';
import { bandScale } from '../../../src/primitives/graph';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const months: string[] = ['Jan', 'Feb', 'Mar'];
const scale = bandScale(months, [0, 300]);
const data = [
  { desktop: 100, mobile: 40 },
  { desktop: 205, mobile: 90 },
  { desktop: 150, mobile: 60 },
];

interface Scene {
  open: boolean;
}

/** No stylesheet loads in the a11y browser, so the plot the tooltip tracks
 *  is pinned to a real box: a pointer position then normalizes to a datum. */
const PLOT_SIZE = 'div[data-part="plot"]{width:300px;height:100px}';

function Tooltip() {
  return (
    <main>
      <style>{PLOT_SIZE}</style>
      <ChartContainer config={config}>
        <ChartTooltip scale={scale} data={data} content={<ChartTooltipContent />} />
      </ChartContainer>
    </main>
  );
}

function nextFrame(): Promise<void> {
  return new Promise<void>((done) => requestAnimationFrame(() => done()));
}

/** Moves the pointer over the plot's second band and returns the open panel.
 *  The panel is portaled to document.body (getPortalContainer, the same
 *  primitive Float composes), outside the render container, so the panel
 *  itself is the audit host for the open state. */
async function openOnFeb(container: HTMLElement): Promise<HTMLElement> {
  const plot = container.querySelector('div[data-part="plot"]') as HTMLElement;
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
  test(`chart-tooltip ${name}`, async ({ task }) => {
    const { container } = await render(<Tooltip />);
    const host = scene.open ? await openOnFeb(container) : container;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
