/**
 * Value axis for a cartesian chart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - No required decisions; an optional label is the
 * only surface. No visual output of its own.
 * @attention-economics Invisible until a chart-type component (Bar/Line/Area)
 * reads it; never competes for attention on its own.
 * @trust-building Its presence or absence is the whole signal -- a consumer
 * always knows whether a chart has a value axis by reading the tree, not by
 * hunting for a boolean prop.
 * @accessibility Structural marker only in #2224; the accessible tick
 * rendering is owned by the chart-type component that composes it, using
 * `graph.ts`'s `ticks()` against its own resolved data domain.
 * @semantic-meaning Ports shadcn's `<YAxis />` call site verbatim.
 *
 * @usage-patterns
 * DO: Compose as a child of a cartesian chart when it needs a value axis
 * DO: Omit it for axis-less charts (sparklines) -- omission, never a flag
 * NEVER: Render tick marks here -- the owning chart type does, from real data
 *
 * @example
 * ```tsx
 * <ChartContainer config={config}>
 *   <YAxis />
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { YAxisConfig } from './y-axis.behavior';

export interface YAxisProps extends Pick<YAxisConfig, 'label'> {}

/** A structural marker: honestly empty until the chart-type component that
 *  reads it draws real ticks (`graph.ts` `ticks()`) against its own domain. */
export const YAxis: React.FC<YAxisProps> = ({ label }) => (
  <div data-part="y-axis" data-label={label} hidden />
);

YAxis.displayName = 'YAxis';

export default YAxis;
