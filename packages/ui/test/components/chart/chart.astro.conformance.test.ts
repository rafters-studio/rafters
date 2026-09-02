/**
 * Astro performance of the chart-container score, driven end to end.
 * AstroContainer renders the SSR markup but does NOT run the <script>, so
 * this test calls bindChart directly -- that IS the script's job -- then
 * drives the same score the React and WC suites drive.
 *
 * Filename note: this suite's `.astro.conformance.test.ts` suffix is a
 * mechanical requirement of `vitest.config.astro.ts` (its `include` and the
 * main config's matching `exclude` both key on this literal string) --
 * renaming it away from "conformance" would silently drop it from both test
 * runs. See the PR body for the full note on this naming conflict.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Chart from '../../../src/components/chart/chart.astro';
import CartesianGrid from '../../../src/components/chart/cartesian-grid.astro';
import XAxis from '../../../src/components/chart/x-axis.astro';
import YAxis from '../../../src/components/chart/y-axis.astro';
import { bindChart } from '../../../src/components/chart/chart.behavior';
import { assertAxeClean } from '../../harness/conformance';
import { stubResizeObserver } from '../../harness/resize-observer';

afterEach(() => {
  document.body.innerHTML = '';
  // #2243 deferred low finding: the caller owns vi.unstubAllGlobals() after
  // stubResizeObserver (test/harness/resize-observer.ts), matching every
  // other vi.stubGlobal usage in this codebase.
  vi.unstubAllGlobals();
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
};

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Chart, {
    props: { id: 'c', config, ...props },
    slots,
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('rafters-chart-container') as HTMLElement;
  // happy-dom's innerHTML parser leaves numeric character entities intact in
  // attribute values (same quirk aspect-ratio's Astro suite decodes for class
  // names); a real browser decodes `&#34;` to `"` when parsing HTML, so undo
  // it here before the bind reads data-config as JSON.
  const rawConfig = root.getAttribute('data-config');
  if (rawConfig) root.setAttribute('data-config', rawConfig.replaceAll('&#34;', '"'));
  bindChart(root); // the <script> does this per instance on the real page
  return root;
}

describe('chart-container [astro]', () => {
  it('SSR: root and plot render, config serialized as data-config', async () => {
    const root = await mount();
    expect(root.getAttribute('data-config')).toBe(JSON.stringify(config));
    expect(root.querySelector('[data-part="plot"]')).not.toBeNull();
  });

  it('bind: measures size via observeResize and exposes it on the root', async () => {
    const { triggerResize } = stubResizeObserver();
    const root = await mount();
    triggerResize([{ contentRect: { width: 640, height: 360 } }]);
    expect(root.dataset['chartWidth']).toBe('640');
    expect(root.dataset['chartHeight']).toBe('360');
  });

  it('slotted children (axis/grid) pass through and stay hidden', async () => {
    const container = await AstroContainer.create();
    const gridHtml = await container.renderToString(CartesianGrid, { props: {} });
    const xAxisHtml = await container.renderToString(XAxis, { props: { dataKey: 'month' } });
    const yAxisHtml = await container.renderToString(YAxis, { props: {} });
    const root = await mount({}, { default: `${gridHtml}${xAxisHtml}${yAxisHtml}` });

    expect(root.querySelector('[data-part="grid"]')).not.toBeNull();
    expect(root.querySelector('[data-part="x-axis"]')?.getAttribute('data-key')).toBe('month');
    expect(root.querySelector('[data-part="y-axis"]')).not.toBeNull();
    expect(root.querySelector('[data-part="x-axis"]')).toHaveProperty('hidden', true);
  });

  it('omitted axis/grid children render nothing -- absence by omission', async () => {
    const root = await mount();
    expect(root.querySelector('[data-part="x-axis"]')).toBeNull();
    expect(root.querySelector('[data-part="y-axis"]')).toBeNull();
    expect(root.querySelector('[data-part="grid"]')).toBeNull();
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const root = await mount();
    await assertAxeClean(root);
  });
});
