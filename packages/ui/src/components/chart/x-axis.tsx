/**
 * Category axis for a cartesian chart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - One required decision: which data key is the
 * category axis. No visual surface of its own to reason about.
 * @attention-economics Invisible until a chart-type component (Bar/Line/Area)
 * reads it; never competes for attention on its own.
 * @trust-building Its presence or absence is the whole signal -- a consumer
 * always knows whether a chart has a category axis by reading the tree, not
 * by hunting for a boolean prop.
 * @accessibility Structural marker only in #2224; the accessible axis
 * rendering (tick labels, aria-hidden SVG) is owned by the chart-type
 * component that composes it (Bar #2225 pins the pattern).
 * @semantic-meaning Ports shadcn's `<XAxis dataKey="month" />` call site
 * verbatim -- the category key lives on this child, never on ChartConfig.
 *
 * @usage-patterns
 * DO: Compose as a child of a cartesian chart when it needs a category axis
 * DO: Set dataKey to the same key the chart reads its category values from
 * NEVER: Add a categoryKey to ChartConfig instead -- it belongs here
 * NEVER: Render tick marks here -- the owning chart type does, from real data
 *
 * @example
 * ```tsx
 * <ChartContainer config={config}>
 *   <XAxis dataKey="month" />
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { XAxisConfig } from './x-axis.behavior';

export interface XAxisProps extends Pick<XAxisConfig, 'dataKey'> {}

/** A structural marker: honestly empty until the chart-type component that
 *  reads it (Bar #2225, Line #2226, Area #2227) draws real ticks against its
 *  own data domain. `hidden` keeps it out of layout and the accessibility
 *  tree without deleting the compositional signal. */
export const XAxis: React.FC<XAxisProps> = ({ dataKey }) => (
  <div data-part="x-axis" data-key={dataKey} hidden />
);

XAxis.displayName = 'XAxis';

export default XAxis;
