/**
 * React integration suite for the chart-container score (#2224). ChartContainer
 * is a static score whose only dynamic datum is the measured plot size, so
 * this drives the composed `observeResize` primitive end to end (stubbed
 * ResizeObserver, shared with graph.ts's own suite) plus the compositional
 * axis/grid children -- present vs omitted, never a flag.
 */
import * as React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartContainer, useChartConfig, useChartSize } from '../../../src/components/chart/chart';
import { CartesianGrid } from '../../../src/components/chart/cartesian-grid';
import { XAxis } from '../../../src/components/chart/x-axis';
import { YAxis } from '../../../src/components/chart/y-axis';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { assertAxeClean } from '../../harness/conformance';
import { stubResizeObserver } from '../../harness/resize-observer';

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  // #2243 deferred low finding: stubResizeObserver stubs the global
  // ResizeObserver (test/harness/resize-observer.ts), and its own doc
  // says the caller owns vi.unstubAllGlobals() afterward, matching every
  // other vi.stubGlobal usage in this codebase.
  vi.unstubAllGlobals();
});

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

describe('ChartContainer [react]', () => {
  it('renders root and plot parts and passes axe clean', async () => {
    // Wrapped in <main>: ChartContainer's box is a layout utility (same
    // disposition as AspectRatio's), its content carries the semantics --
    // axe's landmark-region rule is about the page, not this component.
    render(
      <main>
        <ChartContainer config={config}>content</ChartContainer>
      </main>,
    );
    expect(body().querySelector('[data-part="root"]')).not.toBeNull();
    expect(body().querySelector('[data-part="plot"]')).not.toBeNull();
    await assertAxeClean(body());
  });

  it('measures width/height via observeResize and exposes them to children', () => {
    const { triggerResize } = stubResizeObserver();
    function Probe() {
      const size = useChartSize();
      return <span data-testid="size">{`${size.width}x${size.height}`}</span>;
    }
    render(
      <ChartContainer config={config}>
        <Probe />
      </ChartContainer>,
    );

    // Before layout: zero, per the score's initial state.
    expect(screen.getByTestId('size').textContent).toBe('0x0');

    act(() => {
      triggerResize([{ contentRect: { width: 640, height: 360 } }]);
    });
    expect(screen.getByTestId('size').textContent).toBe('640x360');

    // A resize updates children again.
    act(() => {
      triggerResize([{ contentRect: { width: 320, height: 180 } }]);
    });
    expect(screen.getByTestId('size').textContent).toBe('320x180');
  });

  it('provides config via context to child chart shells', () => {
    function Probe() {
      const consumed = useChartConfig();
      return <span data-testid="config">{consumed['desktop']?.label}</span>;
    }
    render(
      <ChartContainer config={config}>
        <Probe />
      </ChartContainer>,
    );
    expect(screen.getByTestId('config').textContent).toBe('Desktop');
  });

  it('useChartConfig/useChartSize outside a ChartContainer return safe defaults', () => {
    function Probe() {
      const consumed = useChartConfig();
      const size = useChartSize();
      return <span data-testid="probe">{`${Object.keys(consumed).length}:${size.width}`}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId('probe').textContent).toBe('0:0');
  });

  it('shadcn structural port: a shadcn ChartConfig object minus color, with token, is accepted', () => {
    // shadcn's shape: Record<string, { label?: ReactNode; icon?: ComponentType; color?: string }>.
    // rafters' divergence: color -> token (a name, never a hex/var()).
    const shadcnShapedConfig = {
      desktop: { label: 'Desktop', token: 'chart-1' },
      mobile: { label: 'Mobile', icon: () => null, token: 'chart-2' },
    } satisfies ChartConfig;
    render(<ChartContainer config={shadcnShapedConfig}>x</ChartContainer>);
    expect(body().querySelector('[data-part="root"]')).not.toBeNull();
  });
});

describe('cartesian axis/grid children [react]', () => {
  it('renders an axis/grid part ONLY when the child is present', () => {
    render(
      <ChartContainer config={config}>
        <CartesianGrid />
        <XAxis dataKey="month" />
        <YAxis label="Revenue" />
      </ChartContainer>,
    );
    expect(body().querySelector('[data-part="x-axis"]')?.getAttribute('data-key')).toBe('month');
    expect(body().querySelector('[data-part="y-axis"]')?.getAttribute('data-label')).toBe(
      'Revenue',
    );
    const grid = body().querySelector('[data-part="grid"]');
    expect(grid?.getAttribute('data-horizontal')).toBe('true');
    expect(grid?.getAttribute('data-vertical')).toBe('true');
  });

  it('renders NO axis/grid part when the child is omitted -- absence by omission', () => {
    render(<ChartContainer config={config}>bars only</ChartContainer>);
    expect(body().querySelector('[data-part="x-axis"]')).toBeNull();
    expect(body().querySelector('[data-part="y-axis"]')).toBeNull();
    expect(body().querySelector('[data-part="grid"]')).toBeNull();
  });

  it('CartesianGrid vertical={false} reflects the toggle (shadcn parity)', () => {
    render(
      <ChartContainer config={config}>
        <CartesianGrid vertical={false} />
      </ChartContainer>,
    );
    const grid = body().querySelector('[data-part="grid"]');
    expect(grid?.getAttribute('data-horizontal')).toBe('true');
    expect(grid?.getAttribute('data-vertical')).toBe('false');
  });

  it('axis/grid children stay out of layout and the accessibility tree', async () => {
    render(
      <main>
        <ChartContainer config={config}>
          <CartesianGrid />
          <XAxis dataKey="month" />
          <YAxis />
        </ChartContainer>
      </main>,
    );
    expect(body().querySelector('[data-part="x-axis"]')).toHaveProperty('hidden', true);
    await assertAxeClean(body());
  });
});
