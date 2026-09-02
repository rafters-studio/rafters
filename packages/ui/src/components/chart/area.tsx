/**
 * One data series for an AreaChart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - One required decision: which data key this series
 * plots. No visual surface of its own to reason about.
 * @attention-economics Invisible on its own; contributes to the existence
 * and ORDER of the areas AreaChart renders -- the series list AreaChart
 * derives from composed `<Area>` children follows their declaration order
 * exactly, and for a stacked chart that order is also the stack order
 * (bottom to top).
 * @trust-building A consumer always knows a chart's series (which, and in
 * what order) by reading the tree, not by hunting for an array prop or a
 * hidden z-order rule -- reordering `<Area>` children reorders the rendered
 * series, and the stack, deterministically.
 * @accessibility Structural marker only; the accessible area geometry,
 * color, and keyboard traversal all belong to the owning AreaChart (#2227
 * pins the pattern, mirroring Bar/BarChart #2225), which is the one thing
 * this child feeds (its `dataKey`).
 * @semantic-meaning Ports shadcn's `<Area dataKey="desktop" />` call site
 * verbatim: AreaChart derives its series list from composed `<Area>`
 * children, in declaration order, whenever at least one is present;
 * AreaChart's own `series: string[]` config still works with no `<Area>`
 * children at all, and `<Area>` children take precedence outright when both
 * are given.
 *
 * @usage-patterns
 * DO: Compose one `<Area dataKey="..."/>` per series, in the order they should render/stack
 * DO: Rely on `<Area>` children order for series and stack order -- no separate index/z prop exists
 * NEVER: Pass BOTH `series` and `<Area>` children expecting them to merge -- children win outright
 * NEVER: Add a color, token, or other visual prop here -- ChartConfig's token map owns color
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <AreaChart data={data}>
 *     <XAxis dataKey="month" />
 *     <Area dataKey="desktop" />
 *     <Area dataKey="mobile" />
 *   </AreaChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { AreaConfig } from './area.behavior';

export interface AreaProps extends Pick<AreaConfig, 'dataKey'> {}

/** A structural marker: AreaChart reads `dataKey` off this child's props
 *  directly (React element tree, not the DOM) to build its series list, same
 *  way it reads `<XAxis dataKey>` for the category key. `hidden` keeps it out
 *  of layout and the accessibility tree without deleting the compositional
 *  signal, matching Bar/XAxis/YAxis/CartesianGrid. */
export const Area: React.FC<AreaProps> = ({ dataKey }) => (
  <div data-part="series" data-key={dataKey} hidden />
);

Area.displayName = 'Area';

export default Area;
