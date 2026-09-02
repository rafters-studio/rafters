/**
 * ChartTooltip -- pointer-driven datum surface over a chart's plot (#2228)
 *
 * @cognitive-load 2/10 - One consumer decision (what `content` renders); the
 * hit-testing, positioning, and announcing are invisible plumbing.
 * @attention-economics Appears only while a datum is under the pointer;
 * never competes for attention at rest, and never blocks the plot's own
 * pointer events (`pointer-events-none` on the floating panel).
 * @trust-building The swatch color and label always trace to the SAME
 * `ChartConfig` the legend and marks read -- a tooltip row can never show a
 * color or label the rest of the chart disagrees with.
 * @accessibility Never focusable (matches the shipped tooltip/hover-card
 * contract): the datum is announced through `sr-announcer` on every change,
 * one-shot per transition, so a screen-reader user gets the same content a
 * sighted pointer user sees. Keyboard datum traversal is the owning chart
 * shell's responsibility (Bar #2225 etc.) -- it dispatches into this SAME
 * `point`/`clear` action pair, so this component never needs to know
 * whether a datum arrived via mouse, touch, or keyboard.
 * @semantic-meaning Ports shadcn's `<ChartTooltip content={<ChartTooltipContent />} />`
 * call site. One declared divergence: shadcn's version reads its plot data
 * from Recharts internally; rafters has no such pipeline yet (Bar/Line/Area
 * do not exist in this tree), so `ChartTooltip` takes `scale`/`data` as
 * explicit optional props the owning chart shell will supply once built.
 * Omitted, it mounts and tracks the pointer but never resolves a datum --
 * no throw (the issue's error-handling contract).
 *
 * @usage-patterns
 * DO: Render inside a `ChartContainer` so `useChartConfig()` resolves
 * DO: Pass the SAME `graph.ts` `bandScale()` the chart shell renders against
 * NEVER: Reconstruct swatch colors -- always read `TooltipRowData.swatchClass`
 *
 * @example
 * ```tsx
 * <ChartContainer config={config}>
 *   <ChartTooltip scale={xScale} data={rows} content={<ChartTooltipContent />} />
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { createBehavior, type PartIds } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { computePosition } from '../../primitives/collision-detector';
import type { BandScale } from '../../primitives/graph';
import { getPortalContainer } from '../../primitives/portal';
import { useChartConfig } from './chart';
import {
  bandCenter,
  chartTooltip,
  startChartTooltipEffects,
  tooltipHeaderLabel,
  tooltipRows,
  type ChartDatum,
  type ChartTooltipContentConfig,
  type ChartTooltipPart,
  type TooltipRowData,
} from './chart-tooltip.behavior';
import { chartTooltipClasses, chartTooltipIndicatorWrapperClass } from './chart-tooltip.classes';

const EMPTY_SCALE: BandScale<string> = {
  scale: () => 0,
  bandwidth: () => 0,
  step: () => 0,
  domain: [],
  range: [0, 0],
};
const EMPTY_DATA: readonly Readonly<Record<string, number>>[] = [];

export interface ChartTooltipProps {
  /** graph.ts `bandScale()` output for the category axis. Omitted, the
   *  tooltip mounts and tracks the pointer but never resolves a datum. */
  scale?: BandScale<string> | undefined;
  /** Per-category series values, index-aligned with `scale.domain`. */
  data?: readonly Readonly<Record<string, number>>[] | undefined;
  /** shadcn parity: an element cloned with the resolved datum, or a render function. */
  content: React.ReactElement | ((datum: ChartDatum | null) => React.ReactNode);
}

/** Props `ChartTooltip` injects into `content` -- mirrors Recharts' injected
 *  `payload`/`active` props. Consumers never set these directly. */
export interface ChartTooltipInjectedProps {
  datum?: ChartDatum | null;
}

export function ChartTooltip({
  scale = EMPTY_SCALE,
  data = EMPTY_DATA,
  content,
}: ChartTooltipProps): React.ReactElement {
  const config = useChartConfig();
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const { memory, dispatch } = React.useMemo(() => createBehavior(chartTooltip, {}), []);
  const state = useMemory(memory);

  // Composes sr-announcer directly (Spec 03: retired effects layer, a
  // behavior composes primitives in a plain function called from useEffect).
  // See startChartTooltipEffects' doc comment for the two primitives this
  // issue evaluated and did NOT compose (interactive, hover-delay) and why.
  React.useEffect(() => {
    const plot = rootRef.current?.closest<HTMLElement>('[data-part="plot"]');
    if (!plot) return;
    return startChartTooltipEffects({
      plot,
      scale,
      data,
      config,
      dispatchPoint: (payload) => {
        dispatch('point', {}, payload);
      },
      dispatchClear: () => {
        dispatch('clear', {});
      },
      getState: () => memory.get(),
    });
  }, [scale, data, config, dispatch, memory]);

  // Anchor tracks the hit BAND's center, not the raw pointer pixel -- a
  // chart tooltip snaps to the datum (shadcn/Recharts convention), it does
  // not trail the cursor. Recomputed only on datum change.
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const plot = rootRef.current?.closest<HTMLElement>('[data-part="plot"]');
    if (!anchor || !plot || !state.datum) return;
    const plotRect = plot.getBoundingClientRect();
    const center = bandCenter(scale, state.datum.category);
    anchor.style.left = `${plotRect.left + center}px`;
    anchor.style.top = `${plotRect.top + plotRect.height / 2}px`;
  }, [state.datum, scale]);

  // Positions + portals directly via the same two primitives `Float`
  // composes (computePosition, getPortalContainer) rather than `Float`'s
  // React compound component: `Float.Content`'s own positioning effect only
  // re-runs on open/scroll/resize, never on an anchor that moves by having
  // its inline style rewritten -- it cannot track a moving datum out of the
  // box. Recomputing here, keyed on the datum, is the narrowest fix;
  // reworking Float.tsx itself is out of this issue's scope (a shared
  // primitive, not additive chart-family surface).
  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const floating = contentRef.current;
    if (!anchor || !floating || !state.datum) return;
    const result = computePosition(anchor, floating, {
      side: 'top',
      align: 'center',
      sideOffset: 8,
      avoidCollisions: true,
    });
    floating.style.transform = `translate(${Math.round(result.x)}px, ${Math.round(result.y)}px)`;
  }, [state.datum]);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<ChartTooltipPart>;
    for (const part of Object.keys(chartTooltip.parts) as ChartTooltipPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);
  const aria = chartTooltip.aria(state, {}, ids);
  const classes = chartTooltipClasses();

  const injected: ChartTooltipInjectedProps = { datum: state.datum };
  const rendered =
    typeof content === 'function'
      ? content(state.datum)
      : React.isValidElement(content)
        ? React.cloneElement(content, injected as Partial<unknown>)
        : content;

  const portalContainer = getPortalContainer({ enabled: true });
  const floatingNode = (
    <div
      ref={contentRef}
      id={ids.content}
      data-part="content"
      data-state={state.datum ? 'open' : 'closed'}
      className={classy(classes.content)}
      style={{ position: 'fixed', left: 0, top: 0, willChange: 'transform' }}
      {...aria.content}
    >
      {rendered}
    </div>
  );

  return (
    <span ref={rootRef} id={ids.root} data-part="root" {...aria.root}>
      <span
        ref={anchorRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0 }}
      />
      {portalContainer ? createPortal(floatingNode, portalContainer) : floatingNode}
    </span>
  );
}

ChartTooltip.displayName = 'ChartTooltip';

/** Renders one header + one row per series -- the default `ChartTooltipContent`
 *  body, factored out so it stays identical whether reached via
 *  `React.cloneElement` (the normal path) or exercised directly in tests. */
function renderTooltipBody(
  rows: TooltipRowData[],
  header: string,
  classes: ReturnType<typeof chartTooltipClasses>,
  contentConfig: ChartTooltipContentConfig,
): React.ReactElement {
  const indicator = contentConfig.indicator ?? 'dot';
  return (
    <>
      {!contentConfig.hideLabel && header ? <div className={classes.header}>{header}</div> : null}
      {rows.map((row) => (
        <div key={row.key} className={classes.row} data-part="row">
          {!contentConfig.hideIndicator ? (
            <svg
              className={chartTooltipIndicatorWrapperClass(indicator)}
              viewBox="0 0 10 10"
              aria-hidden="true"
            >
              {indicator === 'dot' ? (
                <circle cx="5" cy="5" r="5" className={row.swatchClass} />
              ) : (
                <rect width="10" height="10" rx="1" className={row.swatchClass} />
              )}
            </svg>
          ) : null}
          <span className={classes.label}>{row.label}</span>
          <span className={classes.value}>{row.value ?? ''}</span>
        </div>
      ))}
    </>
  );
}

export interface ChartTooltipContentProps
  extends ChartTooltipContentConfig, ChartTooltipInjectedProps {}

/** Rendered by `ChartTooltip` (cloned with the resolved `datum`); rendering
 *  it standalone shows nothing (`datum` is undefined/null outside that
 *  composition) -- same contract as Recharts' own content components. */
export function ChartTooltipContent(props: ChartTooltipContentProps): React.ReactElement | null {
  const { datum, ...contentConfig } = props;
  const chartConfig = useChartConfig();
  const classes = chartTooltipClasses();
  if (!datum) return null;
  const rows = tooltipRows(datum, chartConfig, contentConfig.nameKey);
  const header = tooltipHeaderLabel(datum, chartConfig, contentConfig.labelKey);
  return renderTooltipBody(rows, header, classes, contentConfig);
}

ChartTooltipContent.displayName = 'ChartTooltipContent';

export default ChartTooltip;
