/**
 * a11y suite for the chart family (#2224): axe across the React and WC
 * renders, plus the two static guarantees the issue pins outside axe's
 * reach -- no chart-family score ever claims a keyboard contract (they are
 * all static scores; Bar/Line/Area own real keyboard traversal later), and
 * every class this family emits is a literal token class, never a hex,
 * `var()`, or arbitrary value (Boundary 00 sec 6).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ChartContainer } from '../../../src/components/chart/chart';
import { CartesianGrid } from '../../../src/components/chart/cartesian-grid';
import { XAxis } from '../../../src/components/chart/x-axis';
import { YAxis } from '../../../src/components/chart/y-axis';
import { RaftersCartesianGrid } from '../../../src/components/chart/cartesian-grid.element';
import { RaftersChartContainer } from '../../../src/components/chart/chart.element';
import { RaftersXAxis } from '../../../src/components/chart/x-axis.element';
import { RaftersYAxis } from '../../../src/components/chart/y-axis.element';
import { cartesianGrid } from '../../../src/components/chart/cartesian-grid.behavior';
import { chartContainer } from '../../../src/components/chart/chart.behavior';
import { xAxis } from '../../../src/components/chart/x-axis.behavior';
import { yAxis } from '../../../src/components/chart/y-axis.behavior';
import {
  chartContainerClasses,
  resolveSeriesClass,
  resolveSeriesStrokeClass,
} from '../../../src/components/chart/chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile' },
} satisfies ChartConfig;

describe('chart family a11y [react]', () => {
  it('ChartContainer with every axis/grid child composed is axe-clean', async () => {
    const { container } = render(
      React.createElement(
        'main',
        null,
        React.createElement(
          ChartContainer,
          { config },
          React.createElement(CartesianGrid, null),
          React.createElement(XAxis, { dataKey: 'month' }),
          React.createElement(YAxis, null),
        ),
      ),
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

describe('chart family a11y [wc]', () => {
  it('the light-DOM composition is axe-clean', async () => {
    document.body.innerHTML = `
      <main>
        <rafters-chart-container data-part="root" data-config='${JSON.stringify(config)}'>
          <div data-part="plot">
            <rafters-cartesian-grid data-part="grid" hidden></rafters-cartesian-grid>
            <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
            <rafters-y-axis data-part="y-axis" hidden></rafters-y-axis>
          </div>
        </rafters-chart-container>
      </main>`;
    if (!customElements.get('rafters-chart-container')) {
      customElements.define('rafters-chart-container', RaftersChartContainer);
    }
    if (!customElements.get('rafters-cartesian-grid')) {
      customElements.define('rafters-cartesian-grid', RaftersCartesianGrid);
    }
    if (!customElements.get('rafters-x-axis'))
      customElements.define('rafters-x-axis', RaftersXAxis);
    if (!customElements.get('rafters-y-axis'))
      customElements.define('rafters-y-axis', RaftersYAxis);

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('no chart-family score claims a keyboard contract', () => {
  it('chartContainer.keymap never claims a key', () => {
    expect(
      chartContainer.keymap({ key: 'Enter' }, { width: 0, height: 0 }, 'root', { config: {} }),
    ).toBeNull();
    expect(
      chartContainer.keymap({ key: 'ArrowRight' }, { width: 0, height: 0 }, 'plot', { config: {} }),
    ).toBeNull();
  });

  it('xAxis/yAxis/cartesianGrid.keymap never claim a key', () => {
    expect(xAxis.keymap({ key: 'Enter' }, {}, 'x-axis', { dataKey: 'month' })).toBeNull();
    expect(yAxis.keymap({ key: 'Enter' }, {}, 'y-axis', {})).toBeNull();
    expect(cartesianGrid.keymap({ key: 'Enter' }, {}, 'grid', {})).toBeNull();
  });
});

describe('color token compliance -- no hex, no var(), no arbitrary value', () => {
  const FORBIDDEN = /#[0-9a-f]{3,8}\b|var\(--|\[[^\]]*\]/i;

  it('resolveSeriesClass never emits a hex/var()/arbitrary class for any series/index', () => {
    for (let index = 0; index < 12; index++) {
      expect(resolveSeriesClass(config, 'desktop', index)).not.toMatch(FORBIDDEN);
      expect(resolveSeriesStrokeClass(config, 'desktop', index)).not.toMatch(FORBIDDEN);
    }
  });

  it('resolveSeriesClass output is always exactly fill-chart-N', () => {
    for (let index = 0; index < 10; index++) {
      expect(resolveSeriesClass(config, 'mobile', index)).toMatch(/^fill-chart-[1-5]$/);
    }
  });

  it('chartContainerClasses emits no color/spacing/motion literal', () => {
    const classes = chartContainerClasses({ config }, { width: 0, height: 0 });
    expect(classes.root).not.toMatch(FORBIDDEN);
    expect(classes.plot).not.toMatch(FORBIDDEN);
    // No spacing-scale (p-*, m-*, gap-*) or motion (animate-*, transition-*)
    // utility -- Container/Grid own layout, chart owns none.
    expect(classes.root).not.toMatch(/\b(p|m|gap)-\d/);
    expect(classes.root).not.toMatch(/\b(animate|transition)-/);
  });
});
