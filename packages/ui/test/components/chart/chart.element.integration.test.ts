/**
 * WC integration suite for the chart-container score, driven end to end
 * against light-DOM markup -- same score as the React suite, proving the
 * `data-config` JSON transport and the composed `observeResize` primitive
 * drive through the DOM-native binding. `connectedCallback` defers one
 * microtask (05-authoring WC bind timing rule), so every mount awaits one
 * `Promise.resolve()` before asserting.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCartesianGrid } from '../../../src/components/chart/cartesian-grid.element';
import { RaftersChartContainer } from '../../../src/components/chart/chart.element';
import { RaftersXAxis } from '../../../src/components/chart/x-axis.element';
import { RaftersYAxis } from '../../../src/components/chart/y-axis.element';
import { stubResizeObserver } from '../../harness/resize-observer';

beforeAll(() => {
  if (!customElements.get('rafters-chart-container')) {
    customElements.define('rafters-chart-container', RaftersChartContainer);
  }
  if (!customElements.get('rafters-x-axis')) customElements.define('rafters-x-axis', RaftersXAxis);
  if (!customElements.get('rafters-y-axis')) customElements.define('rafters-y-axis', RaftersYAxis);
  if (!customElements.get('rafters-cartesian-grid')) {
    customElements.define('rafters-cartesian-grid', RaftersCartesianGrid);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(config: unknown): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-chart-container data-part="root" data-config='${JSON.stringify(config)}'>
      <div data-part="plot"></div>
    </rafters-chart-container>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-chart-container') as HTMLElement;
}

describe('chart-container [wc]', () => {
  it('round-trips a fixture ChartConfig through the data-config JSON attribute', async () => {
    const fixture = {
      desktop: { label: 'Desktop', token: 'chart-1' },
      mobile: { label: 'Mobile' },
    };
    const root = await mount(fixture);
    // The bind parsed data-config without throwing -- a malformed or
    // out-of-range fixture would have thrown synchronously inside the
    // deferred bind (asserted directly against bindChart in chart.test.ts).
    expect(root.getAttribute('data-config')).toBe(JSON.stringify(fixture));
  });

  it('exposes measured size on the root for child binds (ResizeObserver stub)', async () => {
    const { triggerResize } = stubResizeObserver();
    const root = await mount({});

    triggerResize([{ contentRect: { width: 640, height: 360 } }]);
    expect(root.dataset['chartWidth']).toBe('640');
    expect(root.dataset['chartHeight']).toBe('360');

    triggerResize([{ contentRect: { width: 320, height: 180 } }]);
    expect(root.dataset['chartWidth']).toBe('320');
    expect(root.dataset['chartHeight']).toBe('180');
  });

  it('tears down the observer on disconnect', async () => {
    const { triggerResize, disconnectSpy } = stubResizeObserver();
    const root = await mount({});
    triggerResize([{ contentRect: { width: 100, height: 100 } }]);

    root.remove();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('an empty config renders without throwing', async () => {
    stubResizeObserver();
    await expect(mount({})).resolves.toBeInstanceOf(HTMLElement);
  });
});

describe('axis/grid child elements [wc]', () => {
  it('register as custom elements and carry their authored config as data-*', () => {
    document.body.innerHTML = `
      <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
      <rafters-y-axis data-part="y-axis" hidden></rafters-y-axis>
      <rafters-cartesian-grid data-part="grid" data-horizontal="true" data-vertical="false" hidden></rafters-cartesian-grid>
    `;
    expect(document.querySelector('[data-part="x-axis"]')?.getAttribute('data-key')).toBe('month');
    expect(document.querySelector('[data-part="grid"]')?.getAttribute('data-vertical')).toBe(
      'false',
    );
    expect(document.querySelector('rafters-x-axis')).toBeInstanceOf(RaftersXAxis);
    expect(document.querySelector('rafters-y-axis')).toBeInstanceOf(RaftersYAxis);
    expect(document.querySelector('rafters-cartesian-grid')).toBeInstanceOf(RaftersCartesianGrid);
  });
});
