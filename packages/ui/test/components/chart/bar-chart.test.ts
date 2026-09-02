import { validateMotionComposition } from '@rafters/design-tokens';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  barAria,
  barChart,
  computeBars,
  type Bar,
  type BarChartBehaviorConfig,
} from '../../../src/components/chart/bar-chart.behavior';
import {
  barChartClasses,
  resolveBarFillClass,
} from '../../../src/components/chart/bar-chart.classes';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';
import { hasArbitraryValue } from '../../../src/primitives/classy';
import { bandScale, linearScale } from '../../../src/primitives/graph';

const cfg = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

const BEHAVIOR_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/components/chart/bar-chart.behavior.ts',
);

describe('Spec 01 rule 1: behavior.ts never imports a classes module', () => {
  it('bar-chart.behavior.ts has no import from any *.classes module', () => {
    const source = readFileSync(BEHAVIOR_PATH, 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*\.classes['"]/);
  });
});

const data = [
  { month: 'Jan', desktop: 100, mobile: 40 },
  { month: 'Feb', desktop: 120, mobile: 60 },
];

describe('computeBars: grouped (default)', () => {
  const width = 300;
  const height = 200;

  it('rect geometry matches bandScale/linearScale computed directly, for a fixture dataset', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
    });

    const band = bandScale(['Jan', 'Feb'], [0, width], { paddingInner: 0.2, paddingOuter: 0.1 });
    const valueScale = linearScale([0, 120], [height, 0]); // Feb:desktop is the max (120)
    const subBandwidth = band.bandwidth() / 2;

    const janDesktop = bars.find((b) => b.key === 'Jan:desktop');
    expect(janDesktop?.x).toBeCloseTo(band.scale('Jan'));
    expect(janDesktop?.width).toBeCloseTo(subBandwidth);
    expect(janDesktop?.y).toBeCloseTo(valueScale(100));
    expect(janDesktop?.height).toBeCloseTo(valueScale(0) - valueScale(100));

    const janMobile = bars.find((b) => b.key === 'Jan:mobile');
    expect(janMobile?.x).toBeCloseTo(band.scale('Jan') + subBandwidth);
    expect(janMobile?.width).toBeCloseTo(subBandwidth);
    expect(janMobile?.y).toBeCloseTo(valueScale(40));
  });

  it('every bar has non-negative height', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
    });
    expect(bars.every((b) => b.height >= 0)).toBe(true);
  });
});

describe('computeBars: stacked', () => {
  const width = 300;
  const height = 200;

  it('segments accumulate along the value axis, matching bandScale/linearScale directly', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
      stacked: true,
    });

    const band = bandScale(['Jan', 'Feb'], [0, width], { paddingInner: 0.2, paddingOuter: 0.1 });
    const valueScale = linearScale([0, 180], [height, 0]); // Feb total: 120 + 60 = 180

    const janDesktop = bars.find((b) => b.key === 'Jan:desktop');
    expect(janDesktop?.width).toBeCloseTo(band.bandwidth());
    expect(janDesktop?.y).toBeCloseTo(valueScale(100));
    expect(janDesktop?.height).toBeCloseTo(valueScale(0) - valueScale(100));

    const janMobile = bars.find((b) => b.key === 'Jan:mobile');
    expect(janMobile?.width).toBeCloseTo(band.bandwidth());
    expect(janMobile?.y).toBeCloseTo(valueScale(140)); // 100 + 40
    expect(janMobile?.height).toBeCloseTo(valueScale(100) - valueScale(140));
  });
});

describe('computeBars: horizontal layout', () => {
  const width = 300;
  const height = 200;

  it('swaps axes: category bands run along y, value grows along x from the left', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width,
      height,
      layout: 'horizontal',
    });

    const band = bandScale(['Jan', 'Feb'], [0, height], { paddingInner: 0.2, paddingOuter: 0.1 });
    const valueScale = linearScale([0, 120], [0, width]);
    const subBandwidth = band.bandwidth() / 2;

    const janDesktop = bars.find((b) => b.key === 'Jan:desktop');
    expect(janDesktop?.y).toBeCloseTo(band.scale('Jan'));
    expect(janDesktop?.height).toBeCloseTo(subBandwidth);
    expect(janDesktop?.x).toBeCloseTo(0);
    expect(janDesktop?.width).toBeCloseTo(valueScale(100));

    const janMobile = bars.find((b) => b.key === 'Jan:mobile');
    expect(janMobile?.y).toBeCloseTo(band.scale('Jan') + subBandwidth);
    expect(janMobile?.width).toBeCloseTo(valueScale(40));
  });
});

describe('computeBars: color', () => {
  it('each bar carries its series key and index; resolveBarFillClass resolves exactly its series fill-chart-N from ChartConfig', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    expect(bars.every((b) => /^fill-chart-[1-5]$/.test(resolveBarFillClass(cfg, b)))).toBe(true);

    const janDesktop = bars.find((b) => b.key === 'Jan:desktop') as Bar;
    const janMobile = bars.find((b) => b.key === 'Jan:mobile') as Bar;
    expect(janDesktop.series).toBe('desktop');
    expect(janDesktop.seriesIndex).toBe(0);
    expect(resolveBarFillClass(cfg, janDesktop)).toBe('fill-chart-1');
    expect(janMobile.series).toBe('mobile');
    expect(janMobile.seriesIndex).toBe(1);
    expect(resolveBarFillClass(cfg, janMobile)).toBe('fill-chart-2');
  });
});

describe('computeBars: error handling', () => {
  it('empty data renders an empty plot -- no throw', () => {
    expect(
      computeBars({ data: [], series: ['desktop'] }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toEqual([]);
  });

  it('a series key absent from data rows is a Zod validation error naming the key', () => {
    expect(() =>
      computeBars({ data: [{ month: 'Jan', desktop: 100 }], series: ['desktop', 'mobile'] }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toThrow(/mobile/);
  });

  it('more than 5 series is a loud validation error naming the 5-token limit', () => {
    const manySeries = ['a', 'b', 'c', 'd', 'e', 'f'];
    const row = Object.fromEntries([['month', 'Jan'], ...manySeries.map((k) => [k, 1])]);
    expect(() =>
      computeBars({ data: [row], series: manySeries }, cfg, {
        categoryKey: 'month',
        width: 300,
        height: 200,
      }),
    ).toThrow(/5/);
  });
});

describe('issue #2225 functional test block', () => {
  it('matches the spec verbatim', () => {
    const bars = computeBars({ data, series: ['desktop', 'mobile'] }, cfg, {
      categoryKey: 'month',
      width: 300,
      height: 200,
    });
    const febDesktop = bars.find((b) => b.key === 'Feb:desktop') as Bar;
    expect(febDesktop.series).toBe('desktop');
    expect(febDesktop.seriesIndex).toBe(0);
    expect(resolveBarFillClass(cfg, febDesktop)).toBe('fill-chart-1');
    expect(bars.every((b) => b.height >= 0)).toBe(true);
  });
});

const baseConfig: BarChartBehaviorConfig = {
  data,
  series: ['desktop', 'mobile'],
  chartConfig: cfg,
  categoryKey: 'month',
  width: 300,
  height: 200,
};

describe('barChart behavior spec', () => {
  it('declares root/plot/bar/table parts, bar as many', () => {
    expect(Object.keys(barChart.parts).sort()).toEqual(['bar', 'plot', 'root', 'table']);
    expect(barChart.parts.bar?.many).toBe(true);
  });

  it('initialState derives bars via computeBars and a null active cursor', () => {
    const state = barChart.initialState(baseConfig);
    expect(state.bars).toHaveLength(4); // 2 categories x 2 series
    expect(state.activeIndex).toBeNull();
  });

  it('initialState derives value-axis ticks via ticks(), covering the data range', () => {
    const state = barChart.initialState(baseConfig);
    expect(state.valueTicks.length).toBeGreaterThan(0);
    expect(state.valueTicks[state.valueTicks.length - 1]).toBeGreaterThanOrEqual(120);
  });

  it('canDispatch is false once bars are empty (no data)', () => {
    const emptyConfig = { ...baseConfig, data: [] };
    expect(barChart.canDispatch(barChart.initialState(emptyConfig), 'moveNext', emptyConfig)).toBe(
      false,
    );
  });

  it('moveNext/movePrevious/moveFirst/moveLast traverse and clamp the active-datum cursor', () => {
    const { memory, dispatch } = createBehavior(barChart, baseConfig);
    expect(dispatch('moveNext', baseConfig)).toBe(true);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('moveNext', baseConfig);
    expect(memory.get().activeIndex).toBe(1);
    dispatch('moveLast', baseConfig);
    expect(memory.get().activeIndex).toBe(3);
    dispatch('moveNext', baseConfig); // clamps at the last bar
    expect(memory.get().activeIndex).toBe(3);
    dispatch('moveFirst', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
    dispatch('movePrevious', baseConfig); // clamps at the first bar
    expect(memory.get().activeIndex).toBe(0);
  });

  it('movePrevious from a null cursor lands on the first bar, same entry point as moveNext', () => {
    const { memory, dispatch } = createBehavior(barChart, baseConfig);
    dispatch('movePrevious', baseConfig);
    expect(memory.get().activeIndex).toBe(0);
  });

  it('keymap claims arrow keys and Home/End on root and plot only, never on bar', () => {
    const state = barChart.initialState(baseConfig);
    expect(barChart.keymap({ key: 'ArrowRight' }, state, 'root', baseConfig)).toBe('moveNext');
    expect(barChart.keymap({ key: 'ArrowDown' }, state, 'plot', baseConfig)).toBe('moveNext');
    expect(barChart.keymap({ key: 'ArrowLeft' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(barChart.keymap({ key: 'ArrowUp' }, state, 'root', baseConfig)).toBe('movePrevious');
    expect(barChart.keymap({ key: 'Home' }, state, 'root', baseConfig)).toBe('moveFirst');
    expect(barChart.keymap({ key: 'End' }, state, 'root', baseConfig)).toBe('moveLast');
    expect(barChart.keymap({ key: 'ArrowRight' }, state, 'bar', baseConfig)).toBeNull();
    expect(barChart.keymap({ key: 'a' }, state, 'root', baseConfig)).toBeNull();
  });

  it('aria: root carries a descriptive label, plot is aria-hidden, bar is omitted (many part)', () => {
    const state = barChart.initialState(baseConfig);
    const ids = { root: '', plot: '', bar: '', table: '' };
    const projection = barChart.aria(state, baseConfig, ids);
    expect(projection.root?.['aria-label']).toContain('desktop');
    expect(projection.root?.['aria-label']).toContain('mobile');
    expect(projection.plot).toEqual({ 'aria-hidden': 'true' });
    expect(projection.bar).toBeUndefined();
  });

  it('barAria marks every bar aria-hidden and visible, and flags only the active one', () => {
    const state = { ...barChart.initialState(baseConfig), activeIndex: 0 };
    const active = barAria(state.bars[0]?.key ?? '', state, baseConfig, {});
    expect(active).toEqual({
      'aria-hidden': 'true',
      'data-state': 'visible',
      'data-active': 'true',
    });
    const inactive = barAria(state.bars[1]?.key ?? '', state, baseConfig, {});
    expect(inactive['data-active']).toBe('false');
  });
});

describe('motion: matrix declaration (#2225 AC4; BehaviorSpec.motion is spec-reserved but unimplemented, #1990 open)', () => {
  // 01-behavior-contract.md:123-125 reserves `motion?: MotionMap<Part>` on
  // BehaviorSpec, but #1990 (open) owns the shape and the two-directional
  // existence/assignment gate -- inventing a shape here ahead of that landing
  // would be exactly the invention the contract note warns against. Until
  // #1990 lands, this component's one motion moment is declared the way
  // every other component in this codebase declares one today: a row in
  // docs/spec/matrix/motion.jsonl, consumed as a generated animate-* utility.
  const MATRIX_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../docs/spec/matrix/motion.jsonl',
  );

  function motionRows(): Array<Record<string, unknown>> {
    return readFileSync(MATRIX_PATH, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it('the bar-chart bar enter moment is declared as a matrix row, provenance proposed', () => {
    const row = motionRows().find(
      (r) => r['component'] === 'bar-chart' && r['part'] === 'bar' && r['transition'] === 'enter',
    );
    expect(row, 'no (bar-chart, bar, enter) row in motion.jsonl').toBeDefined();
    expect(row?.['duration']).toMatchObject({
      kind: 'tier',
      tier: 'normal',
      provenance: 'proposed',
    });
    expect(row?.['curve']).toMatchObject({ kind: 'role', role: 'enter', provenance: 'proposed' });
  });

  it('barChartClasses references the generated animate-bar-chart-bar-enter utility', () => {
    const classes = barChartClasses({ layout: 'vertical' }, barChart.initialState(baseConfig));
    expect(classes.bar).toContain('animate-bar-chart-bar-enter');
  });

  it('the bar-enter composition (scale, no translate/rotate) is legal under validateMotionComposition', () => {
    // Describes the SAME moment the matrix row and the generated keyframe
    // express (grow-in: scaleY(0) -> scaleY(1), no opacity/translate/rotate --
    // structural geometry, not a pop), independent of any BehaviorSpec.motion
    // declaration. MotionComposition's `scale` flag is axis-agnostic, so a
    // scaleY-only composition is described the same way a uniform scale would be.
    const violations = validateMotionComposition({
      scale: true,
      elementSize: 'large',
      answers: ['what-happened'],
    });
    expect(violations).toEqual([]);
  });
});

describe('barChartClasses', () => {
  // Hex/var() literals only -- NOT a bare `[...]` scan, which would also flag
  // a legitimate variant like `data-[state=visible]:` (a Tailwind ARBITRARY
  // VARIANT selector, not an arbitrary VALUE). `hasArbitraryValue` (classy.ts)
  // already draws that exact line: arbitrary in the utility position only.
  const FORBIDDEN_LITERAL = /#[0-9a-f]{3,8}\b|var\(--/i;
  const classes = barChartClasses({ layout: 'vertical' }, barChart.initialState(baseConfig));

  it('consumes the generated animate-bar-chart-bar-enter utility off data-state', () => {
    expect(classes.bar).toContain('data-[state=visible]:animate-bar-chart-bar-enter');
  });

  it('never carries a numeric duration or motion-reduce:animate-none', () => {
    expect(classes.bar).not.toMatch(/\d+m?s\b/);
    expect(classes.bar).not.toMatch(/motion-reduce:animate-none/);
  });

  it('emits no hex or var() literal in any class string', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(FORBIDDEN_LITERAL);
    }
  });

  it('emits no arbitrary-value utility (classy.ts hasArbitraryValue)', () => {
    for (const value of Object.values(classes)) {
      for (const cls of value.split(/\s+/).filter(Boolean)) {
        expect(hasArbitraryValue(cls), cls).toBe(false);
      }
    }
  });
});
