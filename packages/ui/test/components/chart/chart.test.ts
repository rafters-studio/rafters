import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  bindChart,
  chartContainer,
  parseChartConfig,
  type ChartConfig,
} from '../../../src/components/chart/chart.behavior';
import {
  resolveSeriesClass,
  resolveSeriesStrokeClass,
} from '../../../src/components/chart/chart.classes';
import {
  cartesianGrid,
  readCartesianGridConfig,
} from '../../../src/components/chart/cartesian-grid.behavior';
import { readXAxisConfig, xAxis } from '../../../src/components/chart/x-axis.behavior';
import { readYAxisConfig, yAxis } from '../../../src/components/chart/y-axis.behavior';
import { stubResizeObserver } from '../../harness/resize-observer';

describe('parseChartConfig', () => {
  it('accepts a valid config', () => {
    const input = {
      desktop: { label: 'Desktop', token: 'chart-1' },
      mobile: { label: 'Mobile', token: 'chart-2' },
    };
    expect(parseChartConfig(input)).toEqual(input);
  });

  it('accepts an empty config -- renders an empty plot, no throw', () => {
    expect(parseChartConfig({})).toEqual({});
  });

  it('accepts a series with no token (index-fallback path)', () => {
    expect(parseChartConfig({ mobile: { label: 'Mobile' } })).toEqual({
      mobile: { label: 'Mobile' },
    });
  });

  it('rejects an out-of-range token, naming the key and the rejected value', () => {
    expect(() => parseChartConfig({ x: { token: 'chart-6' } })).toThrow(/chart-6/);
    expect(() => parseChartConfig({ x: { token: 'chart-6' } })).toThrow(/x\.token/);
  });

  it('rejects a hex color in place of a token', () => {
    expect(() => parseChartConfig({ x: { token: '#ff0000' } })).toThrow(/x\.token/);
  });

  it('rejects a var() reference in place of a token', () => {
    expect(() => parseChartConfig({ x: { token: 'var(--chart-1)' } })).toThrow(/x\.token/);
  });

  it('rejects a malformed series entry, naming the key', () => {
    expect(() => parseChartConfig({ x: { label: 42 } })).toThrow(/x\.label/);
  });

  it('rejects non-object input at the root', () => {
    expect(() => parseChartConfig(null)).toThrow(/Invalid ChartConfig/);
    expect(() => parseChartConfig('nope')).toThrow(/Invalid ChartConfig/);
  });
});

describe('resolveSeriesClass', () => {
  const config = {
    desktop: { label: 'Desktop', token: 'chart-1' },
    mobile: { label: 'Mobile' },
  } satisfies ChartConfig;

  it('resolves an explicit token to its literal fill class', () => {
    expect(resolveSeriesClass(config, 'desktop')).toBe('fill-chart-1');
  });

  it('falls back to an explicit index when the series has no token', () => {
    expect(resolveSeriesClass(config, 'mobile', 1)).toBe('fill-chart-2');
  });

  it('falls back to the key position in config when no index is supplied', () => {
    expect(resolveSeriesClass(config, 'mobile')).toBe('fill-chart-2');
  });

  it('wraps past chart-5 back to chart-1', () => {
    expect(resolveSeriesClass(config, 'mobile', 5)).toBe('fill-chart-1');
    expect(resolveSeriesClass(config, 'mobile', 6)).toBe('fill-chart-2');
  });

  it('an explicit token always wins over index/position fallback', () => {
    expect(resolveSeriesClass(config, 'desktop', 4)).toBe('fill-chart-1');
  });
});

describe('resolveSeriesStrokeClass', () => {
  const config = {
    desktop: { label: 'Desktop', token: 'chart-3' },
    mobile: { label: 'Mobile' },
  } satisfies ChartConfig;

  it('resolves an explicit token to its literal stroke class', () => {
    expect(resolveSeriesStrokeClass(config, 'desktop')).toBe('stroke-chart-3');
  });

  it('falls back to index for a token-less series', () => {
    expect(resolveSeriesStrokeClass(config, 'mobile', 1)).toBe('stroke-chart-2');
  });
});

describe('chartContainer behavior spec', () => {
  it('declares root and plot parts with an empty aria contract', () => {
    const config = { config: {} };
    const state = chartContainer.initialState(config);
    expect(Object.keys(chartContainer.parts).sort()).toEqual(['plot', 'root']);
    expect(chartContainer.aria(state, config, { root: '', plot: '' })).toEqual({
      root: {},
      plot: {},
    });
  });

  it('initial state is a zero size', () => {
    expect(chartContainer.initialState({ config: {} })).toEqual({ width: 0, height: 0 });
  });

  it('never claims a keymap entry', () => {
    expect(
      chartContainer.keymap({ key: 'Enter' }, { width: 0, height: 0 }, 'root', { config: {} }),
    ).toBeNull();
  });

  it('canDispatch always allows resize (no suppression surface)', () => {
    expect(chartContainer.canDispatch({ width: 0, height: 0 }, 'resize', { config: {} })).toBe(
      true,
    );
  });

  it('resize replaces state with the new size', () => {
    const config = { config: {} };
    const { memory, dispatch } = createBehavior(chartContainer, config);
    expect(dispatch('resize', config, { width: 800, height: 400 })).toBe(true);
    expect(memory.get()).toEqual({ width: 800, height: 400 });
  });

  it('resize is a no-op for the same effective value (effective-value-diff convention)', () => {
    const config = { config: {} };
    const { memory, dispatch } = createBehavior(chartContainer, config);
    dispatch('resize', config, { width: 800, height: 400 });
    const first = memory.get();
    dispatch('resize', config, { width: 800, height: 400 });
    expect(memory.get()).toBe(first); // same reference: reducer returned state unchanged
  });
});

describe('bindChart', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function mount(config: ChartConfig = {}): HTMLElement {
    document.body.innerHTML = `
      <div data-part="root" data-config='${JSON.stringify(config)}'>
        <div data-part="plot"></div>
      </div>`;
    return document.body.querySelector('[data-part="root"]') as HTMLElement;
  }

  it('children receive non-zero width/height after layout (ResizeObserver stub)', () => {
    const { triggerResize } = stubResizeObserver();
    const root = mount({ desktop: { label: 'Desktop', token: 'chart-1' } });

    const teardown = bindChart(root);
    triggerResize([{ contentRect: { width: 640, height: 360 } }]);

    expect(root.dataset['chartWidth']).toBe('640');
    expect(root.dataset['chartHeight']).toBe('360');

    teardown();
  });

  it('a resize updates the exposed size again', () => {
    const { triggerResize } = stubResizeObserver();
    const root = mount();

    const teardown = bindChart(root);
    triggerResize([{ contentRect: { width: 640, height: 360 } }]);
    triggerResize([{ contentRect: { width: 320, height: 180 } }]);

    expect(root.dataset['chartWidth']).toBe('320');
    expect(root.dataset['chartHeight']).toBe('180');

    teardown();
  });

  it('teardown disconnects the observer', () => {
    const { triggerResize, disconnectSpy } = stubResizeObserver();
    const root = mount();
    const teardown = bindChart(root);
    triggerResize([{ contentRect: { width: 100, height: 100 } }]);

    teardown();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('an out-of-range token in data-config fails loud, naming the key', () => {
    stubResizeObserver();
    const root = mount();
    root.setAttribute('data-config', JSON.stringify({ x: { token: 'chart-6' } }));
    expect(() => bindChart(root)).toThrow(/chart-6/);
  });

  it('a missing data-config attribute renders an empty plot, no throw', () => {
    stubResizeObserver();
    document.body.innerHTML = `
      <div data-part="root">
        <div data-part="plot"></div>
      </div>`;
    const root = document.body.querySelector('[data-part="root"]') as HTMLElement;
    expect(() => bindChart(root)).not.toThrow();
  });
});

describe('XAxis / YAxis / CartesianGrid behavior contracts', () => {
  it('XAxis carries dataKey -- the category key lives here, not on ChartConfig', () => {
    expect(Object.keys(xAxis.parts)).toEqual(['x-axis']);
    expect(xAxis.aria({}, { dataKey: 'month' }, { 'x-axis': '' })).toEqual({ 'x-axis': {} });
  });

  it('readXAxisConfig round-trips dataKey off data-key', () => {
    const el = document.createElement('div');
    el.dataset['key'] = 'month';
    expect(readXAxisConfig(el)).toEqual({ dataKey: 'month' });
  });

  it('YAxis has an empty aria contract and an optional label', () => {
    expect(Object.keys(yAxis.parts)).toEqual(['y-axis']);
    expect(yAxis.aria({}, {}, { 'y-axis': '' })).toEqual({ 'y-axis': {} });
  });

  it('readYAxisConfig omits label when absent, carries it when present', () => {
    const bare = document.createElement('div');
    expect(readYAxisConfig(bare)).toEqual({});

    const labeled = document.createElement('div');
    labeled.dataset['label'] = 'Revenue';
    expect(readYAxisConfig(labeled)).toEqual({ label: 'Revenue' });
  });

  it('CartesianGrid has an empty aria contract', () => {
    expect(Object.keys(cartesianGrid.parts)).toEqual(['grid']);
    expect(cartesianGrid.aria({}, {}, { grid: '' })).toEqual({ grid: {} });
  });

  it('readCartesianGridConfig defaults both toggles to true (shadcn parity)', () => {
    const el = document.createElement('div');
    expect(readCartesianGridConfig(el)).toEqual({ horizontal: true, vertical: true });
  });

  it('readCartesianGridConfig respects an explicit false toggle', () => {
    const el = document.createElement('div');
    el.dataset['vertical'] = 'false';
    expect(readCartesianGridConfig(el)).toEqual({ horizontal: true, vertical: false });
  });
});

describe('issue #2224 functional test block', () => {
  it('matches the spec verbatim', () => {
    const config = {
      desktop: { label: 'Desktop', token: 'chart-1' },
      mobile: { label: 'Mobile' },
    } satisfies ChartConfig;
    expect(resolveSeriesClass(config, 'desktop')).toBe('fill-chart-1');
    expect(resolveSeriesClass(config, 'mobile', 1)).toBe('fill-chart-2'); // index fallback
    expect(() => parseChartConfig({ x: { token: 'chart-6' } })).toThrow(/chart-6/);
  });
});
