/**
 * One data series for a LineChart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - One required decision: which data key this series
 * plots. No visual surface of its own to reason about.
 * @attention-economics Invisible on its own; contributes to the existence
 * and ORDER of the lines LineChart renders -- the series list LineChart
 * derives from composed `<Line>` children follows their declaration order
 * exactly.
 * @trust-building A consumer always knows a chart's series (which, and in
 * what order) by reading the tree, not by hunting for an array prop or a
 * hidden z-order rule -- reordering `<Line>` children reorders the rendered
 * series deterministically.
 * @accessibility Structural marker only; the accessible line geometry,
 * color, and keyboard traversal all belong to the owning LineChart (#2226
 * pins the pattern, mirroring #2225's Bar/BarChart split), which is the one
 * thing this child feeds (its `dataKey`).
 * @semantic-meaning Ports shadcn's `<Line dataKey="desktop" />` call site
 * verbatim: LineChart derives its series list from composed `<Line>`
 * children, in declaration order, whenever at least one is present;
 * LineChart's own `series: string[]` config still works with no `<Line>`
 * children at all, and `<Line>` children take precedence outright when both
 * are given.
 *
 * @usage-patterns
 * DO: Compose one `<Line dataKey="..."/>` per series, in the order they should render
 * DO: Rely on `<Line>` children order for series order -- no separate index/z prop exists
 * NEVER: Pass BOTH `series` and `<Line>` children expecting them to merge -- children win outright
 * NEVER: Add a color, token, or other visual prop here -- ChartConfig's token map owns color
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <LineChart data={data}>
 *     <XAxis dataKey="month" />
 *     <Line dataKey="desktop" />
 *     <Line dataKey="mobile" />
 *   </LineChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { LineConfig } from './line.behavior';

export interface LineProps extends Pick<LineConfig, 'dataKey'> {}

/** A structural marker: LineChart reads `dataKey` off this child's props
 *  directly (React element tree, not the DOM) to build its series list,
 *  same way BarChart reads `<Bar dataKey>`. `hidden` keeps it out of layout
 *  and the accessibility tree without deleting the compositional signal. */
export const Line: React.FC<LineProps> = ({ dataKey }) => (
  <div data-part="series" data-key={dataKey} hidden />
);

Line.displayName = 'Line';

export default Line;
