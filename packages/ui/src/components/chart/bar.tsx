/**
 * One data series for a BarChart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - One required decision: which data key this series
 * plots. No visual surface of its own to reason about.
 * @attention-economics Invisible on its own; contributes to the existence
 * and ORDER of the bars BarChart renders -- the series list BarChart derives
 * from composed `<Bar>` children follows their declaration order exactly.
 * @trust-building A consumer always knows a chart's series (which, and in
 * what order) by reading the tree, not by hunting for an array prop or a
 * hidden z-order rule -- reordering `<Bar>` children reorders the rendered
 * series deterministically.
 * @accessibility Structural marker only; the accessible bar geometry, color,
 * and keyboard traversal all belong to the owning BarChart (#2225 pins the
 * pattern), which is the one thing this child feeds (its `dataKey`).
 * @semantic-meaning Ports shadcn's `<Bar dataKey="desktop" />` call site
 * verbatim: BarChart derives its series list from composed `<Bar>` children,
 * in declaration order, whenever at least one is present; BarChart's own
 * `series: string[]` config still works with no `<Bar>` children at all, and
 * `<Bar>` children take precedence outright when both are given.
 *
 * @usage-patterns
 * DO: Compose one `<Bar dataKey="..."/>` per series, in the order they should render
 * DO: Rely on `<Bar>` children order for series order -- no separate index/z prop exists
 * NEVER: Pass BOTH `series` and `<Bar>` children expecting them to merge -- children win outright
 * NEVER: Add a color, token, or other visual prop here -- ChartConfig's token map owns color
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <BarChart data={data}>
 *     <XAxis dataKey="month" />
 *     <Bar dataKey="desktop" />
 *     <Bar dataKey="mobile" />
 *   </BarChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { BarConfig } from './bar.behavior';

export interface BarProps extends Pick<BarConfig, 'dataKey'> {}

/** A structural marker: BarChart reads `dataKey` off this child's props
 *  directly (React element tree, not the DOM) to build its series list, same
 *  way it reads `<XAxis dataKey>` for the category key. `hidden` keeps it out
 *  of layout and the accessibility tree without deleting the compositional
 *  signal, matching XAxis/YAxis/CartesianGrid. */
export const Bar: React.FC<BarProps> = ({ dataKey }) => (
  <div data-part="series" data-key={dataKey} hidden />
);

Bar.displayName = 'Bar';

export default Bar;
